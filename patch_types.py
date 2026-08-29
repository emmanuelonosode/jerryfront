import re
filepath = "/Users/officialbookone/Desktop/Jerry/frontend/lib/listings/types.ts"
with open(filepath, "r") as f:
    content = f.read()

search_str = '  description: string | null;'
replace_str = '  description: string | null;\n\n  schools: any[];\n  rawFees: any[];\n  officeInfo: any;\n  floorPlans: any[];'

content = content.replace(search_str, replace_str)
with open(filepath, "w") as f:
    f.write(content)
print("patched types.ts")
