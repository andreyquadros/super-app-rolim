import { forwardRef, useCallback } from "react";
import { Link, NavLink, useNavigate, type LinkProps, type NavLinkProps, type NavigateOptions, type To } from "react-router";
import { motionAllowed, setNavKind, type NavKind } from "@/lib/navMotion";

interface NavProp {
  /** Tipo de transição: push (padrão), tab ou flow */
  nav?: NavKind;
}

/** Link interno com transição de tela quando o movimento está liberado. */
export const AppLink = forwardRef<HTMLAnchorElement, LinkProps & NavProp>(function AppLink({ nav = "push", onClick, ...props }, ref) {
  return (
    <Link
      ref={ref}
      viewTransition={motionAllowed()}
      onClick={(event) => {
        setNavKind(nav);
        onClick?.(event);
      }}
      {...props}
    />
  );
});

export const AppNavLink = forwardRef<HTMLAnchorElement, NavLinkProps & NavProp>(function AppNavLink(
  { nav = "tab", onClick, ...props },
  ref,
) {
  return (
    <NavLink
      ref={ref}
      viewTransition={motionAllowed()}
      onClick={(event) => {
        setNavKind(nav);
        onClick?.(event);
      }}
      {...props}
    />
  );
});

/** navigate() com tipo de transição (função estável entre renderizações). */
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback(
    (to: To, options: NavigateOptions & NavProp = {}) => {
      const { nav = "push", ...rest } = options;
      setNavKind(nav);
      return navigate(to, { viewTransition: motionAllowed(), ...rest });
    },
    [navigate],
  );
}
