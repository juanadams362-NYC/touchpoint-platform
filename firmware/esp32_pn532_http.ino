#include <Wire.h>
#include <Adafruit_PN532.h>
#include <WiFi.h>
#include <HTTPClient.h>

#define SDA_PIN 21
#define SCL_PIN 22
#define LED_PIN 2




const char* WIFI_SSID = "AFamily";
const char* WIFI_PASS = "JayJujuS2";
unsigned long lastModeCheckMs = 0;
const unsigned long MODE_CHECK_INTERVAL_MS = 5000;
String API_URL = "http://192.168.1.180:3001/api/tap";

Adafruit_PN532 nfc(SDA_PIN, SCL_PIN);

String lastUid = "";
String deviceId = "DEVICE_001";
String modeKey  = "ENTRY";

String fetchModeFromServer() {
  if (WiFi.status() != WL_CONNECTED) return modeKey;

  String url = "http://192.168.1.180:3001/api/device/" + deviceId;

  HTTPClient http;
  http.begin(url);
  int code = http.GET();

  if (code == 200) {
    String payload = http.getString();
    http.end();

    // super simple parse (no JSON lib)
    int idx = payload.indexOf("current_mode");
    if (idx >= 0) {
      int colon = payload.indexOf(":", idx);
      int q1 = payload.indexOf("\"", colon);
      int q2 = payload.indexOf("\"", q1 + 1);
      if (q1 >= 0 && q2 >= 0) {
        String m = payload.substring(q1 + 1, q2);
        m.toUpperCase();
        return m;
      }
    }
    return modeKey;
  }

  http.end();
  return modeKey;
}


void setup() {
  Serial.begin(115200);
  delay(200);

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  Serial.println("TouchPoint NFC Booting...");

  Wire.begin(SDA_PIN, SCL_PIN);

  nfc.begin();
  uint32_t versiondata = nfc.getFirmwareVersion();
  if (!versiondata) {
    Serial.println("PN532 not found");
    while (1) delay(50);
  }

  Serial.print("PN532 found. Firmware: ");
  Serial.println((versiondata >> 16) & 0xFF, HEX);

  nfc.SAMConfig();
  Serial.println("Waiting for NFC tag...");

  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
WiFi.disconnect(true, true);
delay(1000);


  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int tries = 0;
  while (WiFi.status() != WL_CONNECTED && tries < 80) {
    delay(500);
    Serial.print(".");
    tries++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected ✅");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
    Serial.print("POST URL: ");
    Serial.println(API_URL);
  } else {
    Serial.println("\nWiFi FAILED ❌");
  }
  Serial.print("WiFi status: ");
Serial.println(WiFi.status()); // 0..6

}

void loop() {
  uint8_t uid[7];
  uint8_t uidLength;

  bool success = nfc.readPassiveTargetID(
    PN532_MIFARE_ISO14443A, uid, &uidLength, 100
  );

  if (success) {
    String uidStr = "";
    for (uint8_t i = 0; i < uidLength; i++) {
      if (uid[i] < 0x10) uidStr += "0";
      uidStr += String(uid[i], HEX);
    }
    uidStr.toUpperCase();

    if (uidStr != lastUid) {
      lastUid = uidStr;

      Serial.println("Tag UID: " + uidStr);

      digitalWrite(LED_PIN, HIGH);
      delay(120);
      digitalWrite(LED_PIN, LOW);

      if (WiFi.status() == WL_CONNECTED) {

        // ✅ fetch the latest mode right before sending tap
        modeKey = fetchModeFromServer();
        Serial.println("Using mode: " + modeKey);

        HTTPClient http;
        http.begin(API_URL);
        http.addHeader("Content-Type", "application/json");
        http.addHeader("Connection", "close");

        String body =
          "{\"deviceId\":\"" + deviceId +
          "\",\"uid\":\"" + uidStr +
          "\",\"mode\":\"" + modeKey + "\"}";

        int code = http.POST(body);
        Serial.print("HTTP code: ");
        Serial.println(code);

        Serial.print("Response: ");
        Serial.println(http.getString());

        http.end();
      } else {
        Serial.println("WiFi not connected, skipping POST");
      }

      Serial.println("Tap registered ✅");
    }
  } else {
    lastUid = "";
  }

  if (WiFi.status() == WL_CONNECTED && millis() - lastModeCheckMs > MODE_CHECK_INTERVAL_MS) {
  lastModeCheckMs = millis();
  String m = fetchModeFromServer();
  if (m != modeKey) {
    modeKey = m;
    Serial.println("Mode updated from server: " + modeKey);
  }
}
  delay(50);
}
