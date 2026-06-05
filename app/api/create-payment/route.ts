import { NextResponse } from "next/server";
import Omise from "omise";

const omise = Omise({
  publicKey: process.env.OMISE_PUBLIC_KEY!,
  secretKey: process.env.OMISE_SECRET_KEY!,
});

export async function POST() {
  try {
    const source = await omise.sources.create({
      type: "promptpay",
      amount: 50000,
      currency: "THB",
    });
const charge =
  await omise.charges.create({
    amount: 50000,
    currency: "THB",
    source: source.id,
  });

console.log(
  "CHARGE =",
  JSON.stringify(charge, null, 2)
);
console.log(
  "CHARGE SOURCE =",
  JSON.stringify(
    charge.source,
    null,
    2
  )
);
return NextResponse.json({
  success: true,
  qrImage:
    charge.source
      ?.scannable_code
      ?.image
      ?.download_uri,
});

    
  } catch (error: any) {
    console.error("OMISE ERROR =", error);

    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}