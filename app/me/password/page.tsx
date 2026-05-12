import { redirect } from 'next/navigation';

// La página de cambio de contraseña vivía aquí; ahora es parte de /me.
// Redirigimos para mantener compat con bookmarks viejos.
export default function ChangePasswordPage() {
  redirect('/me');
}
