const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
const xml2js = require("xml2js");

const app = express();
const PORT = 5051;
const SOAP_URL = "http://62.240.55.2:6187/BCDUssd/newedfali.asmx";

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// ✅ /pay: إرسال طلب الدفع للمصرف
app.post("/pay", async (req, res) => {
  const { customer, quantity } = req.body;

  console.log("📥 تم استقبال طلب على /pay:", req.body);

  const Mobile = "926388438"; // رقم التاجر
  const Pin = "2715";
  const PW = "123@xdsr$#!!";
  const Amount = (parseFloat(quantity) * 6).toFixed(2); // كل استيكة = 6 د.ل

  const xmlBody = `
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <DoPTrans xmlns="http://tempuri.org/">
          <Mobile>${Mobile}</Mobile>
          <Pin>${Pin}</Pin>
          <Cmobile>+218${customer}</Cmobile>
          <Amount>${Amount}</Amount>
          <PW>${PW}</PW>
        </DoPTrans>
      </soap:Body>
    </soap:Envelope>
  `;

  console.log("📨 SOAP Request:", xmlBody);

  try {
    const response = await axios.post(SOAP_URL, xmlBody, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/DoPTrans"
      }
    });

    console.log("📨 رد XML:", response.data);

    xml2js.parseString(response.data, (err, result) => {
      if (err) {
        console.error("❌ XML Parse Error:", err);
        return res.status(500).json({ error: "XML Parse Error" });
      }

      try {
        const sessionID =
          result["soap:Envelope"]["soap:Body"][0]["DoPTransResponse"][0]["DoPTransResult"][0];
        console.log("📩 رد المصرف:", sessionID);
        res.json({ sessionID });
      } catch (e) {
        console.error("❌ فشل في استخراج sessionID:", e);
        res.status(500).json({ error: "فشل في استخراج sessionID" });
      }
    });
  } catch (error) {
    console.error("❌ فشل الاتصال بالمصرف:", error.message);
    res.status(500).json({ error: "فشل الاتصال بالسيرفر", message: error.message });
  }
});

// ✅ /confirm: تأكيد الدفع باستخدام OTP
app.post("/confirm", async (req, res) => {
  const { otp, sessionID } = req.body;

  const Mobile = "926388438";
  const Pin = otp;
  const PW = "123@xdsr$#!!";

  const xmlBody = `
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                   xmlns:xsd="http://www.w3.org/2001/XMLSchema"
                   xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <OnlineConfTrans xmlns="http://tempuri.org/">
          <Mobile>${Mobile}</Mobile>
          <Pin>${Pin}</Pin>
          <sessionID>${sessionID}</sessionID>
          <PW>${PW}</PW>
        </OnlineConfTrans>
      </soap:Body>
    </soap:Envelope>
  `;

  try {
    const response = await axios.post(SOAP_URL, xmlBody, {
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": "http://tempuri.org/OnlineConfTrans"
      }
    });

    console.log("📨 رد XML تأكيد الدفع:\n", response.data);

    xml2js.parseString(response.data, (err, result) => {
      if (err) {
        console.log("❌ خطأ في XML:", err);
        return res.status(500).json({ error: "XML Parse Error" });
      }

      try {
        const otpResult =
          result["soap:Envelope"]["soap:Body"][0]["OnlineConfTransResponse"][0]["OnlineConfTransResult"][0];
        console.log("✅ رد المصرف:", otpResult);
        res.json({ result: otpResult });
      } catch (e) {
        console.log("❌ فشل في استخراج النتيجة");
        res.status(500).json({ error: "فشل في استخراج النتيجة" });
      }
    });
  } catch (error) {
    console.error("❌ فشل الاتصال بالمصرف:", error.message);
    res.status(500).json({ error: "فشل الاتصال بالسيرفر", message: error.message });
  }
});


onst PORT = process.env.PORT || 5051;

app.listen(PORT, () => {
  console.log(`🚀 TDB Proxy server running on port ${PORT}`);
});
