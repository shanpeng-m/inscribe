"use client";

import { Slot } from "@radix-ui/react-slot";
import { PanelLeft } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_WIDTH = "18rem";
const SIDEBAR_WIDTH_ICON = "5.25rem";

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }

  return context;
}

interface SidebarProviderProps extends React.ComponentProps<"div"> {
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SidebarProvider({
  children,
  className,
  defaultOpen = true,
  onOpenChange,
  open: openProp,
  style,
  ...props
}: SidebarProviderProps) {
  const [openState, setOpenState] = React.useState(defaultOpen);
  const open = openProp ?? openState;

  const setOpen = React.useCallback(
    (value: boolean) => {
      if (openProp === undefined) {
        setOpenState(value);
      }
      onOpenChange?.(value);
    },
    [onOpenChange, openProp]
  );

  const toggleSidebar = React.useCallback(() => {
    setOpen(!open);
  }, [open, setOpen]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggleSidebar,
    }),
    [open, setOpen, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        className={cn("group/sidebar-wrapper flex h-full w-full overflow-hidden", className)}
        data-sidebar-state={open ? "expanded" : "collapsed"}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            ...style,
          } as React.CSSProperties
        }
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

interface SidebarProps extends React.ComponentProps<"aside"> {
  collapsible?: "icon" | "offcanvas" | "none";
  side?: "left" | "right";
  variant?: "sidebar" | "floating" | "inset";
}

export function Sidebar({
  children,
  className,
  collapsible = "icon",
  side = "left",
  variant = "sidebar",
  ...props
}: SidebarProps) {
  const { open } = useSidebar();

  return (
    <aside
      className={cn(
        "relative hidden h-svh shrink-0 md:flex",
        side === "left" ? "border-r" : "order-last border-l",
        variant === "floating" && "p-2",
        className
      )}
      data-collapsible={collapsible}
      data-side={side}
      data-state={open ? "expanded" : "collapsed"}
      style={{
        width:
          collapsible === "none"
            ? "var(--sidebar-width)"
            : open
              ? "var(--sidebar-width)"
              : collapsible === "offcanvas"
                ? "0rem"
                : "var(--sidebar-width-icon)",
      }}
      {...props}
    >
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </aside>
  );
}

export function SidebarHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("shrink-0", className)} {...props} />;
}

export function SidebarFooter({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mt-auto shrink-0", className)} {...props} />;
}

export function SidebarContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-h-0 flex-1 overflow-auto", className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-2", className)} {...props} />;
}

export function SidebarGroupLabel({ className, ...props }: React.ComponentProps<"div">) {
  const { open } = useSidebar();

  return (
    <div
      className={cn(
        "text-muted-foreground flex items-center gap-2 px-3 text-[0.7rem] font-semibold tracking-[0.16em] uppercase transition-opacity",
        !open && "justify-center px-0 [&>span]:hidden",
        className
      )}
      {...props}
    />
  );
}

export function SidebarGroupContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("space-y-1", className)} {...props} />;
}

export function SidebarMenu({ className, ...props }: React.ComponentProps<"ul">) {
  return <ul className={cn("flex flex-col gap-1", className)} {...props} />;
}

export function SidebarMenuItem({ className, ...props }: React.ComponentProps<"li">) {
  return <li className={cn("list-none", className)} {...props} />;
}

interface SidebarMenuButtonProps extends React.ComponentPropsWithoutRef<"button"> {
  asChild?: boolean;
  isActive?: boolean;
}

export function SidebarMenuButton({
  asChild = false,
  className,
  isActive = false,
  ...props
}: SidebarMenuButtonProps) {
  const { open } = useSidebar();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      className={cn(
        "focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-medium transition-all outline-none focus-visible:ring-2",
        "hover:bg-accent hover:text-accent-foreground hover:border-border/80",
        isActive &&
          "bg-accent text-accent-foreground border-border/80 shadow-[0_10px_26px_-22px_rgba(0,0,0,0.6)]",
        !open && "justify-center px-2 [&_[data-sidebar-label='true']]:hidden",
        className
      )}
      data-active={isActive}
      {...props}
    />
  );
}

export function SidebarMenuBadge({ className, ...props }: React.ComponentProps<"span">) {
  const { open } = useSidebar();

  return (
    <span
      className={cn(
        "text-muted-foreground ml-auto text-[0.72rem] font-semibold",
        !open && "hidden",
        className
      )}
      {...props}
    />
  );
}

export function SidebarRail({ className, ...props }: React.ComponentProps<"button">) {
  const { open, toggleSidebar } = useSidebar();

  return (
    <button
      className={cn(
        "bg-background absolute top-5 -right-4 hidden h-8 w-8 items-center justify-center rounded-full border shadow-sm md:flex",
        open && "opacity-0 pointer-events-none",
        className
      )}
      onClick={toggleSidebar}
      type="button"
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </button>
  );
}

export function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentPropsWithoutRef<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      className={cn(className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      size="icon"
      type="button"
      variant="outline"
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

export function SidebarInset({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-w-0 flex-1", className)} {...props} />;
}
