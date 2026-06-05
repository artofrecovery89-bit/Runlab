import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
  const body = await req.json();

  const charge = body.data;

  console.log("STATUS =", charge?.status);
  console.log("METADATA =", charge?.metadata);
  console.log(
    "REPORT ID =",
    charge?.metadata?.reportId
  );

  if (
    charge?.status === "successful"
  ) {
    const reportId =
      charge.metadata?.reportId;

    if (reportId) {
      await supabase
        .from("reports")
        .update({
          is_paid: true,
        })
        .eq("id", reportId);

      console.log(
        "REPORT UNLOCKED",
        reportId
      );
    }
  }

  return NextResponse.json({
    received: true,
  });
}