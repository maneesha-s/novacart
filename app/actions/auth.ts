"use server";

import { SignupSchema, LoginSchema } from "@/lib/validation";
import bcrypt from "bcryptjs";
import { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type SignupState = {
  errors?: {
    name?: string[];
    email?: string[];
    password?: string[];
  };
  message?: string;
  success?: boolean;
};

export async function signup(
  previousState: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const result = SignupSchema.safeParse(rawData);

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    };
  }

  const { name, email, password } = result.data;

  const existingUser = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    return {
      success: false,
      message: "An account with this email already exists.",
    };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  try {
  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
    },
  });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, message: "An account with this email already exists." };
    }
    return { success: false, message: "Unable to create account. Please try again." };
  }

  return {
    success: true,
    message: "Account created successfully.",
  };
}

export type LoginState = {
  message?: string;
};

export async function login(
  previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  try {
    const parsed = LoginSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { message: "Please enter a valid email and password." };
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/account",
    });

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          message: "Invalid email or password.",
        };
      }

      return {
        message: "Something went wrong while signing in.",
      };
    }

    throw error;
  }
}

export async function logout() {
  await signOut({
    redirectTo: "/",
  });
}
