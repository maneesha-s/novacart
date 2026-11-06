"use server";

import { AddressSchema } from "@/lib/validation";
import { requireUser, ResourceId } from "@/lib/authorization";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type AddressState = {
  message?: string;
  errors?: {
    fullName?: string[];
    addressLine?: string[];
    city?: string[];
    state?: string[];
    postalCode?: string[];
    phone?: string[];
  };
};

export async function createAddress(
  previousState: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const user = await requireUser();

  const parsed = AddressSchema.safeParse({
    fullName: formData.get("fullName"),
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  await prisma.address.create({
    data: {
      userId: user.id,
      ...parsed.data,
    },
  });

  revalidatePath("/account/addresses");

  redirect("/account/addresses");
}


export async function setDefaultAddress(addressId: string) {
  const user = await requireUser();

  ResourceId.parse(addressId);
  await prisma.$transaction(async tx => {
    // Serialize default changes for this user, including the ownership check.
    await tx.user.update({ where: { id: user.id }, data: { updatedAt: new Date() } });
    const address = await tx.address.findFirst({ where: { id: addressId, userId: user.id } });
    if (!address) throw new Error("Address not found.");
    await tx.address.updateMany({ where: { userId: user.id, isDefault: true }, data: { isDefault: false } });
    await tx.address.update({ where: { id: address.id, userId: user.id }, data: { isDefault: true } });
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}

export async function deleteAddress(addressId: string) {
  ResourceId.parse(addressId);
  const user = await requireUser();

  await prisma.address.deleteMany({
    where: {
      id: addressId,
      userId: user.id,
    },
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");
}
export async function updateAddress(
  addressId: string,
  previousState: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const user = await requireUser();
  if (!ResourceId.safeParse(addressId).success) return { message: "Invalid address." };

  const parsed = AddressSchema.safeParse({
    fullName: formData.get("fullName"),
    addressLine: formData.get("addressLine"),
    city: formData.get("city"),
    state: formData.get("state"),
    postalCode: formData.get("postalCode"),
    phone: formData.get("phone"),
  });

  if (!parsed.success) {
    return {
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const address = await prisma.address.findFirst({
    where: {
      id: addressId,
      userId: user.id,
    },
  });

  if (!address) {
    return {
      message: "Address not found.",
    };
  }

  await prisma.address.update({
    where: {
      id: address.id,
      userId: user.id,
    },
    data: parsed.data,
  });

  revalidatePath("/account/addresses");
  revalidatePath("/checkout");

  redirect("/account/addresses");
}