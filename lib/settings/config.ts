export const SETTINGS_ROUTES = [
  { href: "/admin/integrations", label: "Integrations" },
  { href: "/admin/people", label: "People" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/budgets", label: "Budgets" },
  { href: "/admin/imports", label: "Imports" },
] as const;

export function isSettingsRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}
