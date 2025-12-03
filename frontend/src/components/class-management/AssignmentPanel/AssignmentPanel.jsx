import { useParams } from "react-router-dom";
import StudentAssignmentPanelPage from "../../../pages/StudentAssignmentPanelPage";
import TeacherAssignmentPanel from "./TeacherAssignmentPanel/TeacherAssignmentPanel";
import { useDispatch, useSelector } from "react-redux";
import { useGetClassDetailsQuery } from "@/redux/api/classGroup/classApi";
import { selectCurrentUser } from "@/redux/slices/authSlice";


export default function AssignmentPanel() {
  const { classId } = useParams();
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser);
  const {
    data: classData,
    isLoading,
    error,
    refetch,
  } = useGetClassDetailsQuery(classId, {
    skip: !classId,
  })

  const isAdmin = classData?.class.group.admins.some((admin) => admin._id === currentUser?._id)
  const isModerator = classData?.class.group.moderators.some((mod) => mod._id === currentUser?._id)
  const canManage = isAdmin || isModerator
  return canManage ? (
    <TeacherAssignmentPanel classId={classId} />
  ) : (
    <StudentAssignmentPanelPage/>
  );
}