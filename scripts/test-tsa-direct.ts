import * as crypto from 'crypto';

async function testTSA() {
  const payloadHash = crypto.createHash('sha256').update('test-payload').digest('hex');
  const hashBuffer = Buffer.from(payloadHash, 'hex');

  // DER-encoded TimeStampReq template
  const prefix = Buffer.from("30360201013031300d060960864801650304020105000420", "hex");
  const req = Buffer.concat([prefix, hashBuffer]);

  console.log("Sending request of size:", req.length);
  try {
    const response = await fetch('http://timestamp.digicert.com', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/timestamp-query',
      },
      body: req
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
    }

    const responseBuffer = Buffer.from(await response.arrayBuffer());
    console.log("Received response of size:", responseBuffer.length);

    let generalizedTimeStr = '';
    for (let i = 0; i < responseBuffer.length - 15; i++) {
      if (responseBuffer[i] === 0x18) {
        const len = responseBuffer[i + 1];
        if (len >= 13 && len <= 20) {
          const timeStr = responseBuffer.toString('ascii', i + 2, i + 2 + len);
          if (/^\d{14,19}Z$/.test(timeStr) || /^\d{14}\.\d+Z$/.test(timeStr)) {
            generalizedTimeStr = timeStr;
            break;
          }
        }
      }
    }

    if (!generalizedTimeStr) {
      throw new Error("Could not find GeneralizedTime tag in response");
    }

    console.log("GeneralizedTime string:", generalizedTimeStr);
    
    const year = parseInt(generalizedTimeStr.substring(0, 4), 10);
    const month = parseInt(generalizedTimeStr.substring(4, 6), 10) - 1;
    const day = parseInt(generalizedTimeStr.substring(6, 8), 10);
    const hour = parseInt(generalizedTimeStr.substring(8, 10), 10);
    const minute = parseInt(generalizedTimeStr.substring(10, 12), 10);
    const second = parseInt(generalizedTimeStr.substring(12, 14), 10);
    
    let ms = 0;
    const dotIndex = generalizedTimeStr.indexOf('.');
    if (dotIndex !== -1) {
      const msStr = generalizedTimeStr.substring(dotIndex + 1, generalizedTimeStr.length - 1);
      ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
    }
    
    const time = Date.UTC(year, month, day, hour, minute, second, ms);
    console.log("Parsed Date:", new Date(time).toISOString());
    console.log("SUCCESS!");
  } catch (err: any) {
    console.error("FAIL:", err.message);
  }
}

testTSA();
