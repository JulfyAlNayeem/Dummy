"use client"
import { useSelector, useDispatch } from "react-redux"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Plus, BookOpen, Users, Settings, AlertCircle } from "lucide-react"
import { useGetUserClassesQuery } from "@/redux/api/classGroup/classApi"
import { selectCurrentUser } from "@/redux/slices/authSlice"
import { selectSelectedClass, setSelectedClass, clearSelectedClass } from "@/redux/slices/classSlice"
import CreateClassForm from "./CreateClassForm"
import ClassDashboard from "./ClassDashboard"
import { useGetUserProfileQuery } from "@/redux/api/user/userApi"
import { useEffect } from "react"

export default function ClassManagementPage() {
  const dispatch = useDispatch()
  const currentUser = useSelector(selectCurrentUser)
  const selectedClass = useSelector(selectSelectedClass)
  const {
    data: classesData,
    isLoading: isLoadingClasses,
    error: classesError,
    refetch: refetchClasses,
  } = useGetUserClassesQuery()

  const { data: profileData, isLoading: isLoadingProfile } = useGetUserProfileQuery()
// console.log(profileData)
  const userClasses = classesData?.classes || []
  const userRole = profileData?.user?.role || "user"
  const canCreateClass = ["teacher", "admin", "superadmin"].includes(userRole)

  const handleClassCreated = (newClass) => {
    refetchClasses()
  }

  const handleClassSelect = (classItem) => {
    dispatch(setSelectedClass(classItem))
  }

  const handleBackToClasses = () => {
    dispatch(clearSelectedClass())
  }


  if (isLoadingClasses || isLoadingProfile) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (classesError) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <p className="text-red-600 mb-4">Failed to load classes</p>
              <Button onClick={refetchClasses} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Class Management</h1>
          <p className="text-muted-foreground">Manage your classes, assignments, and student interactions</p>
        </div>
        {canCreateClass && <Badge variant="secondary">{userRole.charAt(0).toUpperCase() + userRole.slice(1)}</Badge>}
      </div>

      {selectedClass ? (
        <div className="space-y-4">
          <Button variant="outline" onClick={handleBackToClasses}>
            ← Back to Classes
          </Button>
          <ClassDashboard classId={selectedClass._id} />
        </div>
      ) : (
        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            {canCreateClass && <TabsTrigger value="create">Create Class</TabsTrigger>}
          </TabsList>

          <TabsContent value="classes">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userClasses.length === 0 ? (
                <Card className="col-span-full">
                  <CardContent className="p-8 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No Classes Found</h3>
                    <p className="text-muted-foreground mb-4">
                      {canCreateClass
                        ? "Create your first class to get started"
                        : "Join a class or wait for an invitation"}
                    </p>
                    {canCreateClass && (
                      <Button onClick={() => handleClassSelect("create")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Class
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                userClasses.map((classItem) => (
                  <Card
                    key={classItem._id}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                    onClick={() => handleClassSelect(classItem)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{classItem.group.name}</CardTitle>
                        <Badge variant="outline">{classItem.group.classType}</Badge>
                      </div>
                      <CardDescription>{classItem.participants.length} members</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          <span>{classItem.participants.length}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Settings className="h-4 w-4" />
                          {classItem.group.admins.some((admin) => admin._id === currentUser?._id)
                            ? "Admin"
                            : classItem.group.moderators.some((mod) => mod._id === currentUser?._id)
                              ? "Moderator"
                              : "Member"}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          {canCreateClass && (
            <TabsContent value="create">
              <div className="max-w-md mx-auto">
                <CreateClassForm onClassCreated={handleClassCreated} />
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  )
}
