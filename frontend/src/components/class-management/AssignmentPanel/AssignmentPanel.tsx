import { useParams } from "react-router-dom";
import StudentAssignmentPanelPage from "../../../pages/StudentAssignmentPanelPage";
import TeacherAssignmentPanel from "./TeacherAssignmentPanel/TeacherAssignmentPanel";
import { useDispatch, useSelector } from "react-redux";
import { useGetClassDetailsQuery } from "@/redux/api/classGroup/classApi";
import { selectCurrentUser } from "@/redux/slices/authSlice";


export default function AssignmentPanel(): JSX.Element {
  const { classId } = useParams<{ classId: string }>();
  const dispatch = useDispatch()
  const currentUser: any = useSelector(selectCurrentUser);
  const {
    data: classData,
    isLoading,
    error,
    refetch,
  }: any = useGetClassDetailsQuery(classId, {
    skip: !classId,
  })

  const isAdmin = classData?.class.admins?.some((admin) => admin._id === currentUser?._id)
  const isModerator = classData?.class.moderators?.some((mod) => mod._id === currentUser?._id)
  const canManage = isAdmin || isModerator
  return canManage ? (
    <TeacherAssignmentPanel classId={classId} />
  ) : (
    <StudentAssignmentPanelPage/>
  );
}