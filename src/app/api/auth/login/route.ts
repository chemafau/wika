import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

interface User {
  id: string;
  username: string;
  password: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "users.json");

async function getUsers(): Promise<User[]> {
  try {
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password are required" },
        { status: 400 }
      );
    }

    const users = await getUsers();
    const hashedPassword = crypto.createHash("sha256").update(password).digest("hex");

    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === hashedPassword
    );

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const { password: _, ...userWithoutPassword } = user;
    return NextResponse.json({ user: userWithoutPassword });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
