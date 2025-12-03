import { useState } from "react";
import AssignmentStatsCard from "./AssignmentStatsCard";
import MarkAssignmentDialog from "./MarkAssignmentDialog";
import CreateAssignmentCard from "./CreateAssignmentCard";
import { AssignmentList } from "./TeacherAssignmentList";
import DashboardLayout from "@/components/admin/DashboardLayout";

export default function TeacherAssignmentPanel({ classId }) {
  const [markingData, setMarkingData] = useState({
    mark: "",
    feedback: "",
  });
  const [showMarkDialog, setShowMarkDialog] = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);


  const openMarkDialog = (submission) => {
    setSelectedSubmission(submission);
    setMarkingData({ mark: "", feedback: "" });
    setShowMarkDialog(true);
  };

  return (
    <DashboardLayout type="teacher">
      <div className="space-y-6 md:mt-0 mt-8">
        <CreateAssignmentCard classId={classId} />
        <AssignmentStatsCard classId={classId} />
        <MarkAssignmentDialog
          showMarkDialog={showMarkDialog}
          setShowMarkDialog={setShowMarkDialog}
          markingData={markingData}
          setMarkingData={setMarkingData}
          selectedSubmission={selectedSubmission}
          classId={classId}
        />
        <AssignmentList
          classId={classId}
          canManage={true}
          openMarkDialog={openMarkDialog}
        />
      </div>
    </DashboardLayout>
  );
}