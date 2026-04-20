import {
  type LucideIcon,
  BadgeInfo,
  GitBranch,
  MoonStar,
  Settings2,
  SunMedium,
} from "lucide-react";
import logo from "@/assets/inscribe-icon.png";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface SidebarItem {
  count: number;
  icon: LucideIcon;
  key: string;
  label: string;
}

interface AppSidebarProps {
  activeSection: string;
  appName: string;
  navigationLabel: string;
  isDark: boolean;
  settingsLabel: string;
  themeLabel: string;
  version: string;
  items: SidebarItem[];
  onOpenSettings: () => void;
  onSectionSelect: (section: string) => void;
  onToggleTheme: () => void;
}

export function AppSidebar({
  activeSection,
  appName,
  navigationLabel,
  isDark,
  settingsLabel,
  themeLabel,
  version,
  items,
  onOpenSettings,
  onSectionSelect,
  onToggleTheme,
}: AppSidebarProps) {
  const { open } = useSidebar();

  return (
    <Sidebar className="app-sidebar" collapsible="offcanvas" variant="inset">
      <SidebarHeader className="app-sidebar__header">
        {open ? (
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton className="app-sidebar__brand" isActive={false}>
                <span className="brand-mark">
                  <img alt="Inscribe" src={logo} />
                </span>
                <span data-sidebar-label="true" className="brand-copy">
                  <span className="brand-copy__row">
                    <span className="brand-copy__name">{appName}</span>
                    <Badge className="brand-copy__badge" variant="outline">
                      {version}
                    </Badge>
                  </span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        ) : (
          <div className="app-sidebar__brand-collapsed">
            <span className="brand-mark">
              <img alt="Inscribe" src={logo} />
            </span>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent className="app-sidebar__content">
        <SidebarGroup>
          <SidebarGroupLabel>
            <span>{navigationLabel}</span>
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="nav-list">
              {items.map((item) => (
                <SidebarMenuItem key={item.key}>
                  <SidebarMenuButton
                    className={cn("nav-item", activeSection === item.key && "nav-item--active")}
                    isActive={activeSection === item.key}
                    onClick={() => onSectionSelect(item.key)}
                  >
                    <span className="nav-item__left">
                      <span className="nav-item__icon">
                        <item.icon className="size-4" strokeWidth={1.9} />
                      </span>
                      <span data-sidebar-label="true" className="nav-item__label">
                        {item.label}
                      </span>
                    </span>
                    <SidebarMenuBadge className="nav-item__count">{item.count}</SidebarMenuBadge>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="nav-list nav-list--secondary">
              <SidebarMenuItem>
                <SidebarMenuButton
                  className="nav-item nav-item--secondary"
                  onClick={onOpenSettings}
                >
                  <span className="nav-item__left">
                    <span className="nav-item__icon">
                      <BadgeInfo className="size-4" strokeWidth={1.9} />
                    </span>
                    <span data-sidebar-label="true" className="nav-item__label">
                      {settingsLabel}
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton className="nav-item nav-item--secondary">
                  <span className="nav-item__left">
                    <span className="nav-item__icon">
                      <GitBranch className="size-4" strokeWidth={1.9} />
                    </span>
                    <span data-sidebar-label="true" className="nav-item__label">
                      Git
                    </span>
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="app-sidebar__footer">
        <SidebarMenu className="sidebar-footer__menu">
          <SidebarMenuItem>
            <SidebarMenuButton className="sidebar-tool" onClick={onToggleTheme}>
              {isDark ? <SunMedium className="size-4" /> : <MoonStar className="size-4" />}
              <span data-sidebar-label="true" className="nav-item__label">
                {themeLabel}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="sidebar-tool" onClick={onOpenSettings}>
              <Settings2 className="size-4" />
              <span data-sidebar-label="true" className="nav-item__label">
                {settingsLabel}
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail className="hidden" />
    </Sidebar>
  );
}
