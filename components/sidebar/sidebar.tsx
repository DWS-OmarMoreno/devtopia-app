import React from "react";
import { Sidebar } from "./sidebar.styles";
import { Avatar, Tooltip, Image } from "@nextui-org/react";
import { CompaniesDropdown } from "./companies-dropdown";
import { HomeIcon } from "../icons/sidebar/home-icon";
import { PaymentsIcon } from "../icons/sidebar/payments-icon";
import { AccountsIcon } from "../icons/sidebar/accounts-icon";
import { CustomersIcon } from "../icons/sidebar/customers-icon";
import { ProductsIcon } from "../icons/sidebar/products-icon";
import { ChangeLogIcon } from "../icons/sidebar/changelog-icon";
import { SettingsIcon } from "../icons/sidebar/settings-icon";
import { SidebarItem } from "./sidebar-item";
import { SidebarMenu } from "./sidebar-menu";
import { useSidebarContext } from "../layout/layout-context";
import { usePathname } from "next/navigation";
import { useUser } from "@/hooks/useUser";

export const SidebarWrapper = () => {
  const pathname = usePathname();
  const { collapsed, setCollapsed } = useSidebarContext();
  const { tienePermiso, rol } = useUser();

  return (
    <aside className="h-screen z-[20] sticky top-0">
      {collapsed ? (
        <div className={Sidebar.Overlay()} onClick={setCollapsed} />
      ) : null}
      <div
        className={Sidebar({
          collapsed: collapsed,
        })}
      >
        <div className={Sidebar.Header()}>
          <CompaniesDropdown />
        </div>
        <div className="flex flex-col justify-between h-full">
          <div className={Sidebar.Body()}>
            <SidebarItem
              title="Inicio"
              icon={<HomeIcon />}
              isActive={pathname === "/"}
              href="/"
            />
            <SidebarMenu title="Módulos">
              {tienePermiso("CRM_VENTAS", "leer") && (
                <SidebarItem
                  isActive={pathname?.startsWith("/crm") ?? false}
                  title="CRM y Ventas"
                  icon={<CustomersIcon />}
                  href="/crm"
                />
              )}
              {tienePermiso("PRODUCTOS_SERVICIOS", "leer") && (
                <SidebarItem
                  isActive={pathname?.startsWith("/productos-servicios") ?? false}
                  title="Productos y Servicios"
                  icon={<ProductsIcon />}
                  href="/productos-servicios"
                />
              )}
              {tienePermiso("CONTRATOS_PROYECTOS", "leer") && (
                <SidebarItem
                  isActive={pathname?.startsWith("/contratos-proyectos") ?? false}
                  title="Contratos y Proyectos"
                  icon={<AccountsIcon />}
                  href="/contratos-proyectos"
                />
              )}
              {tienePermiso("COMPRAS", "leer") && (
                <SidebarItem
                  isActive={pathname?.startsWith("/compras") ?? false}
                  title="Compras y Subcontratación"
                  icon={<PaymentsIcon />}
                  href="/compras"
                />
              )}
              {tienePermiso("CIERRE_POSTVENTA", "leer") && (
                <SidebarItem
                  isActive={pathname?.startsWith("/cierre-postventa") ?? false}
                  title="Cierre y Postventa"
                  icon={<ChangeLogIcon />}
                  href="/cierre-postventa"
                />
              )}
            </SidebarMenu>

            {tienePermiso("CONFIGURACION", "leer") && (
              <SidebarMenu title="General">
                <SidebarItem
                  isActive={pathname?.startsWith("/configuracion") ?? false}
                  title="Configuración"
                  icon={<SettingsIcon />}
                  href="/configuracion"
                />
              </SidebarMenu>
            )}
          </div>
          <div className={Sidebar.Footer()}>
            <Tooltip content={rol?.nombre ?? "Sin rol"} color="primary">
              <div className="max-w-fit">
                <SettingsIcon />
              </div>
            </Tooltip>
            <Tooltip content={"Perfil"} color="primary">
              <Avatar
                src="https://i.pravatar.cc/150?u=a042581f4e29026704d"
                size="sm"
              />
            </Tooltip>
          </div>
        </div>
      </div>
    </aside>
  );
};
