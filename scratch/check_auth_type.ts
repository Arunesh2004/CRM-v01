import { auth } from "@clerk/nextjs/server";

async function check() {
  const authObj = auth();
  console.log("authObj is:", authObj);
  console.log("is Promise:", authObj instanceof Promise);
}

check();
