import NavbarAuth from "./NavbarAuth";
import NavbarShell from "./NavbarShell";

type NavbarProps = {
  forceGuest?: boolean;
};

export default function Navbar({ forceGuest = false }: NavbarProps) {
  return (
    <NavbarShell>
      <NavbarAuth forceGuest={forceGuest} />
    </NavbarShell>
  );
}
