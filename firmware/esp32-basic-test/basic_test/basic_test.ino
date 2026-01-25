void setup() {
  // put your setup code here, to run once:
  Serial.begin(115200);
  delay(1000);
  Serial.println("ESP32 is alive");

}

void loop() {
  // put your main code here, to run repeatedly:
  delay(2000);
  Serial.println("Heartbeat...");

}
