import { adminDb } from "@/lib/firebase-admin";
import ComplaintsTable from "./ComplaintsTable";

export default async function AdminComplaintsPage() {

  const snapshot = await adminDb
    .collection("complaints")
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();

  const complaints = await Promise.all(
    snapshot.docs.map(async (doc) => {

      const data: any = doc.data();

      let reporterName = data.reporterId;

      try {
        const user = await adminDb
          .collection("users")
          .doc(data.reporterId)
          .get();

        if (user.exists) {
          reporterName =
            user.data()?.name ||
            user.data()?.email ||
            data.reporterId;
        }
      } catch {}

      // Convert Firestore timestamps safely
      const createdAt =
        data.createdAt?.toDate
          ? data.createdAt.toDate().toISOString()
          : data.createdAt || null;

      const updatedAt =
        data.updatedAt?.toDate
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt || null;

      const actionDate =
        data.actionDate?.toDate
          ? data.actionDate.toDate().toISOString()
          : data.actionDate || null;

      const date =
        createdAt
          ? new Date(createdAt).toLocaleString()
          : "-";

      return {
        id: doc.id,
        reporterName,
        reporterId: data.reporterId,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason,
        status: data.status || "open",
        adminNote: data.adminNote || "",
        createdAt,
        updatedAt,
        actionDate,
        date
      };

    })
  );

  return (
    <div className="space-y-6">

      <div>
        <h1 className="text-2xl font-bold">Complaints</h1>
        <p className="text-sm text-muted-foreground">
          Review complaints submitted by users.
        </p>
      </div>

      <ComplaintsTable complaints={complaints} />

    </div>
  );
}