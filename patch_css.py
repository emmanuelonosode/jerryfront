import re
filepath = "/Users/officialbookone/Desktop/Jerry/frontend/app/(site)/homes-for-rent/[slug]/detail.module.css"
with open(filepath, "r") as f:
    content = f.read()

amex_classes = """
/* AMEX DESIGN SYSTEM EXTENSIONS */
.amexHero {
  background-color: #00175A;
  color: #FFFFFF;
  padding: 40px 0;
  margin-bottom: 24px;
}
.amexHeroTitle {
  font-family: "Benton Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 40px;
  font-weight: 600;
  margin-bottom: 8px;
}
.amexHeroLocation {
  font-size: 18px;
  color: #B7C3D9;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}
.amexHeroSpecs {
  display: flex;
  gap: 24px;
  padding-top: 24px;
  border-top: 1px solid #1A3673;
}
.amexHeroSpec {
  display: flex;
  flex-direction: column;
}
.amexHeroSpecValue {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}
.amexHeroSpecLabel {
  font-size: 14px;
  color: #B7C3D9;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.amexSection {
  padding: 48px 0;
  border-bottom: 1px solid #ECEDEE;
}
.amexSectionTitle {
  font-family: "Benton Sans", "Helvetica Neue", Helvetica, Arial, sans-serif;
  font-size: 28px;
  font-weight: 600;
  color: #00175A;
  margin-bottom: 24px;
}

.amexGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 24px;
}

.amexCard {
  background: #FFFFFF;
  border: 1px solid #D5D9DC;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}
.amexCardTitle {
  font-size: 18px;
  font-weight: 600;
  color: #00175A;
  margin-bottom: 8px;
}
.amexCardBody {
  font-size: 14px;
  color: #53565A;
  line-height: 1.5;
}
.amexCardMeta {
  margin-top: 16px;
  font-size: 12px;
  color: #86888C;
}

.amexFeesTable {
  width: 100%;
  border-collapse: collapse;
}
.amexFeesTable th, .amexFeesTable td {
  padding: 16px;
  border-bottom: 1px solid #ECEDEE;
  text-align: left;
}
.amexFeesTable th {
  font-weight: 600;
  color: #00175A;
  background-color: #F7F8F9;
}
.amexFeesTable td {
  color: #1A1A1A;
}
.amexFeesTable tr:last-child td {
  border-bottom: none;
}

.amexButton {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #006FCF;
  color: #FFFFFF;
  font-weight: 600;
  padding: 12px 24px;
  border-radius: 4px;
  text-decoration: none;
  transition: background-color 0.2s;
  border: none;
  width: 100%;
}
.amexButton:hover {
  background-color: #1374D4;
}

.amexRailInner {
  position: sticky;
  top: 24px;
  background: #FFFFFF;
  border: 1px solid #D5D9DC;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 23, 90, 0.08);
  overflow: hidden;
}
.amexRailHeader {
  background: #00175A;
  color: #FFFFFF;
  padding: 24px;
  text-align: center;
}
.amexRailPrice {
  font-size: 36px;
  font-weight: 600;
  margin-bottom: 4px;
}
.amexRailPer {
  color: #B7C3D9;
  font-size: 14px;
}
"""

with open(filepath, "w") as f:
    f.write(content + "\n" + amex_classes)
print("CSS injected")
