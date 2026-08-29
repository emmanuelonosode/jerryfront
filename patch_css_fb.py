import re
filepath = "/Users/officialbookone/Desktop/Jerry/frontend/app/(site)/homes-for-rent/[slug]/detail.module.css"
with open(filepath, "r") as f:
    content = f.read()

# Strip out the Amex block we added earlier
content = content.split("/* AMEX DESIGN SYSTEM EXTENSIONS */")[0].strip()

fb_classes = """
/* FACEBOOK DESIGN SYSTEM EXTENSIONS */
.fbPage {
  background-color: #F0F2F5;
  min-height: 100vh;
  padding-bottom: 64px;
}

.fbContainer {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px 16px;
}

.fbLayout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 960px) {
  .fbLayout {
    grid-template-columns: minmax(0, 1fr) 360px;
  }
}

.fbCard {
  background: #FFFFFF;
  border: 1px solid #CED0D4;
  border-radius: 4px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  margin-bottom: 16px;
  overflow: hidden;
}

.fbCardHeader {
  padding: 16px 16px 12px;
  border-bottom: 1px solid #E4E6EB;
}

.fbCardTitle {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 20px;
  font-weight: 700;
  color: #050505;
  margin: 0;
}

.fbCardBody {
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 15px;
  line-height: 1.5;
  color: #050505;
}

.fbHeroTitle {
  font-size: 24px;
  font-weight: 700;
  color: #050505;
  margin-bottom: 4px;
  padding: 16px 16px 0;
}

.fbHeroLocation {
  font-size: 15px;
  color: #65676B;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px 16px;
  border-bottom: 1px solid #E4E6EB;
}

.fbHeroSpecs {
  display: flex;
  padding: 16px;
  gap: 24px;
}

.fbHeroSpec {
  display: flex;
  flex-direction: column;
}

.fbHeroSpecValue {
  font-size: 17px;
  font-weight: 600;
  color: #050505;
}

.fbHeroSpecLabel {
  font-size: 13px;
  color: #65676B;
}

.fbGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.fbInnerCard {
  border: 1px solid #CED0D4;
  border-radius: 4px;
  padding: 12px;
  background-color: #F7F8FA;
}

.fbInnerCardTitle {
  font-weight: 600;
  color: #050505;
  font-size: 15px;
  margin-bottom: 4px;
}

.fbInnerCardBody {
  font-size: 13px;
  color: #65676B;
}

.fbFeesTable {
  width: 100%;
  border-collapse: collapse;
}

.fbFeesTable th, .fbFeesTable td {
  padding: 12px;
  border-bottom: 1px solid #E4E6EB;
  text-align: left;
  font-size: 15px;
}

.fbFeesTable th {
  font-weight: 600;
  color: #050505;
  background-color: #F0F2F5;
}

.fbFeesTable td {
  color: #050505;
}

.fbFeesTable tr:last-child td {
  border-bottom: none;
}

.fbButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #0866FF;
  color: #FFFFFF;
  font-weight: 600;
  font-size: 15px;
  padding: 8px 24px;
  border-radius: 4px;
  text-decoration: none;
  border: none;
  width: 100%;
  min-height: 40px;
  cursor: pointer;
}

.fbButton:hover {
  background-color: #0056DB;
}

.fbButtonSecondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #E4E6EB;
  color: #050505;
  font-weight: 600;
  font-size: 15px;
  padding: 8px 24px;
  border-radius: 4px;
  text-decoration: none;
  border: none;
  width: 100%;
  min-height: 40px;
  cursor: pointer;
}

.fbButtonSecondary:hover {
  background-color: #D8DADF;
}

.fbRailInner {
  position: sticky;
  top: 16px;
}

.fbRailPriceHeader {
  padding: 16px;
  text-align: center;
  border-bottom: 1px solid #E4E6EB;
}

.fbRailPrice {
  font-size: 28px;
  font-weight: 700;
  color: #050505;
}

.fbRailPer {
  color: #65676B;
  font-size: 15px;
}

.fbRailSplit {
  font-size: 13px;
  color: #65676B;
  text-align: center;
  padding: 12px;
  background-color: #F7F8FA;
  border-bottom: 1px solid #E4E6EB;
}
"""

with open(filepath, "w") as f:
    f.write(content + "\n" + fb_classes)
print("FB CSS injected")
