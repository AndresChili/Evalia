import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { AvatarUpload } from "@/components/profile/avatar-upload";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const profile = await db.profile.findUnique({ where: { userId: session.user.id } });
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex max-w-md flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perfil</h1>
        <p className="text-muted-foreground mt-1 text-sm">{session.user.email}</p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Foto de perfil</h2>
        <AvatarUpload
          initialAvatarUrl={profile.avatarPathname ? `/api/avatars/${session.user.id}` : null}
          displayName={profile.displayName}
        />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Información personal</h2>
        <ProfileForm initialDisplayName={profile.displayName} />
      </section>

      <Separator />

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium">Seguridad</h2>
        <ChangePasswordForm />
      </section>
    </div>
  );
}
