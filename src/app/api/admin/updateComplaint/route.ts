import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
  try {

    const { id, status, adminNote } = await req.json();

    if (!id) {
      return Response.json({ success: false, error: "Missing ID" });
    }

    await adminDb.collection("complaints").doc(id).update({
      status,
      adminNote: adminNote || "",
      updatedAt: new Date(),
    });

    return Response.json({ success: true });

  } catch (error) {

    console.error("Complaint update failed:", error);

    return Response.json({
      success: false,
      error: "Update failed"
    });

  }
}