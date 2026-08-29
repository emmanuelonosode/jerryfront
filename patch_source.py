import re
filepath = "/Users/officialbookone/Desktop/Jerry/frontend/lib/listings/source.ts"
with open(filepath, "r") as f:
    content = f.read()

# 1. Add fields to ApiProperty type
search_apiprop = '  tour_3d_url?: string; tour_video_url?: string;\n};'
replace_apiprop = '  tour_3d_url?: string; tour_video_url?: string;\n  schools?: any[];\n  raw_fees?: any[];\n  office_info?: any;\n  floor_plans?: any[];\n};'
content = content.replace(search_apiprop, replace_apiprop)

# 2. Add fields to toListing return object
search_tolist = '    description: property.description?.trim() || null,\n    lastVerifiedAt: property.last_verified_at ?? \'\','
replace_tolist = '    description: property.description?.trim() || null,\n    schools: property.schools ?? [],\n    rawFees: property.raw_fees ?? [],\n    officeInfo: property.office_info ?? null,\n    floorPlans: property.floor_plans ?? [],\n    lastVerifiedAt: property.last_verified_at ?? \'\','
content = content.replace(search_tolist, replace_tolist)

with open(filepath, "w") as f:
    f.write(content)
print("patched source.ts")
