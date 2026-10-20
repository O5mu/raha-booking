-- Districts get an Arabic name too, like the istiraha name and description.
ALTER TABLE istirahas RENAME COLUMN district TO district_en;
ALTER TABLE istirahas ADD COLUMN district_ar TEXT NOT NULL DEFAULT '';
