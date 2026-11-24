-- The /aire short link preselects this category. Empty catalogs are left for the seed script,
-- and an existing slug (for example one an admin already created) is never overwritten.
INSERT INTO `report_category` (`id`, `slug`, `name`, `icon_key`, `default_priority`, `sort_order`, `is_active`)
SELECT
	'01a20c26-4554-7244-9006-b73cac3eb7cc',
	'air-conditioning',
	'Aire acondicionado con falla',
	'air-vent',
	'normal',
	coalesce(
		(SELECT `sort_order` FROM `report_category` WHERE `slug` = 'other'),
		(SELECT max(`sort_order`) + 1 FROM `report_category`)
	),
	true
WHERE EXISTS (SELECT 1 FROM `report_category`)
ON CONFLICT (`slug`) DO NOTHING;
