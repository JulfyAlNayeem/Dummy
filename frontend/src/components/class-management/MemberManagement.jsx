import { useState, useEffect } from "react";
import { debounce } from "lodash";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"; // Added for limit dropdown
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, UserPlus, UserMinus, Crown, Shield, RefreshCw } from "lucide-react";
import {
  useAddModeratorMutation,
  useRemoveModeratorMutation,
  useAddMemberMutation,
  useRemoveMemberMutation,
  useGetClassDetailsQuery,
} from "@/redux/api/classGroup/classApi";
import { useSearchUserQuery } from "@/redux/api/user/userApi";
import toast from "react-hot-toast";
import DashboardLayout from "../admin/DashboardLayout";
import { useParams } from "react-router-dom";

export default function MemberManagement({ }) {
  const { classId } = useParams();
  const {
    data: classData,
    isLoading,
    error,
    refetch,
  } = useGetClassDetailsQuery(classId, {
    skip: !classId,
  })

  const [searchTerm, setSearchTerm] = useState("");
  const [newMemberQuery, setNewMemberQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const [addModerator] = useAddModeratorMutation();
  const [removeModerator] = useRemoveModeratorMutation();
  const [addMember] = useAddMemberMutation();
  const [removeMember] = useRemoveMemberMutation();

  // Debounce the search query
  const debounceSearch = debounce((value) => {
    setDebouncedQuery(value);
    setPage(1); // Reset to page 1 on new search
  }, 300);

  useEffect(() => {
    debounceSearch(newMemberQuery);
    return () => debounceSearch.cancel();
  }, [newMemberQuery]);

  const { data: searchResult, isLoading: isSearching } = useSearchUserQuery(
    { query: debouncedQuery, page, limit },
    {
      skip: !debouncedQuery || debouncedQuery.length < 3,
    }
  );

  const filteredMembers = classData?.class?.participants.filter(
    (member) =>
      member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const isAdmin = (userId) => classData?.class?.group.admins.some((admin) => admin._id === userId);
  const isModerator = (userId) => classData?.class?.group.moderators.some((mod) => mod._id === userId);
  const canManage = isAdmin || isModerator;


  const handleAddMember = async (user) => {
    try {
      await addMember({ classId, userId: user._id }).unwrap();

      toast.success(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Success </div>
          <div>{user.name} added successfully</div>
        </div>
      );

      setNewMemberQuery("");
      setPage(1);
      setShowAddDialog(false);
    } catch (error) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error</div>
          <div>{error?.data?.message || "Failed to add member"}</div>
        </div>
      );
    }
  };;


  const handleRemoveMember = async (userId) => {
    try {
      await removeMember({ classId, userId }).unwrap();
      toast.success(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Success </div>
          <div>Member removed successfully</div>
        </div>
      );
    } catch (error) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error </div>
          <div>{error?.data?.message || "Failed to remove member"}</div>
        </div>
      );
    }
  };;


  const handleToggleModerator = async (userId, isMod) => {
    try {
      if (isMod) {
        await removeModerator({ classId, userId }).unwrap();
      } else {
        await addModerator({ classId, userId }).unwrap();
      }

      toast.success(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Alhamdulillah</div>
          <div>Moderator {isMod ? "removed" : "added"} successfully</div>
        </div>
      );
    } catch (error) {
      toast.error(
        <div className="text-gray-100 dark:text-gray-900">
          <div className="font-bold">Error ❌</div>
          <div>{error.data?.message || "Failed to update moderator status"}</div>
        </div>
      );
    }
  };

  // Handle loading and error states
  if (isLoading) {
    return <div className="flex items-center justify-center dark:bg-gray-100 bg-gray-800 h-screen w-full">
      <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-900" />
    </div>;
  }

  if (error) {
    return <div>Error loading class data: {error?.data?.message || "Unknown error"}</div>;
  }

  if (!classData) {
    return <div>No class data available</div>;
  }

  return (

    <DashboardLayout type="teacher">

      <Card className="md:mt-0 mt-8 bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-gray-100 dark:text-gray-900">
                <Users className="h-5 w-5 text-blue-400 dark:text-blue-600" />
                Class Members ({filteredMembers?.length})
              </CardTitle>
              <CardDescription className="text-gray-400 dark:text-gray-600">Manage your class members and their roles</CardDescription>

            </div>
            {canManage && (
              <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-gray-800 dark:bg-gray-100 text-green-400 dark:text-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 hover:text-gray-100 dark:hover:text-gray-100">
                    <UserPlus className="h-4 w-4 mr-2 text-green-400 dark:text-blue-600" />
                    Add Member
                  </Button>

                </DialogTrigger>
                <DialogContent className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
                  <DialogHeader>
                    <DialogTitle className="text-gray-100 dark:text-gray-900">Add New Member</DialogTitle>
                    <DialogDescription className="text-gray-400 dark:text-gray-600">
                      Enter the name or email (use @ for email) of the user to add to this class
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex space-x-4">
                      <Input
                        placeholder="Enter name or email (use @ for email)"
                        value={newMemberQuery}
                        onChange={(e) => setNewMemberQuery(e.target.value)}
                        className="flex-grow bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600"
                      />
                      <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                        <SelectTrigger className="w-32 bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300">
                          <SelectValue placeholder="Items per page" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 dark:bg-white border-gray-600 dark:border-gray-300">
                          <SelectItem value="10" className="text-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100">10 per page</SelectItem>
                          <SelectItem value="20" className="text-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100">20 per page</SelectItem>
                          <SelectItem value="50" className="text-gray-100 dark:text-gray-900 hover:bg-gray-700 dark:hover:bg-gray-100">50 per page</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {isSearching && <p className="text-sm text-gray-400 dark:text-gray-600">Searching...</p>}
                    {searchResult?.users?.length > 0 ? (
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {searchResult.users.map((user) => (
                          <div key={user._id} className="p-3 border border-gray-600 dark:border-gray-300 rounded-lg">
                            <div className="flex items-center justify-between space-x-3">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.image || "/placeholder.svg"} />
                                  <AvatarFallback className="bg-gray-700 dark:bg-gray-200 text-gray-100 dark:text-gray-900">{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium text-gray-100 dark:text-gray-900">{user.name}</p>
                                  <p className="text-sm text-gray-400 dark:text-gray-600">{user.email}</p>
                                </div>
                              </div>
                              <Button
                                onClick={() => handleAddMember(user)}
                                disabled={classData?.class?.participants.some((m) => m._id === user._id)}
                                className="bg-gray-800 dark:bg-gray-100 text-green-400 dark:text-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 hover:text-gray-100 dark:hover:text-gray-100"
                              >
                                Add Member
                              </Button>
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between mt-4">
                          <Button
                            onClick={() => setPage(page - 1)}
                            disabled={page === 1}
                            variant="outline"
                            className="border-gray-600 dark:border-gray-300 bg-gray-800 dark:bg-gray-100 text-green-400 dark:text-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 hover:text-gray-100 dark:hover:text-gray-100"
                          >
                            Previous
                          </Button>
                          <p className="text-sm text-gray-400 dark:text-gray-600">
                            Page {searchResult?.page || 1} of {searchResult?.totalPages || 1} (Total: {searchResult?.total || 0})
                          </p>
                          <Button
                            onClick={() => setPage(page + 1)}
                            disabled={page >= (searchResult?.totalPages || 1)}
                            variant="outline"
                            className="border-gray-600 dark:border-gray-300 bg-gray-800 dark:bg-gray-100 text-green-400 dark:text-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 hover:text-gray-100 dark:hover:text-gray-100"
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    ) : (
                      !isSearching &&
                      debouncedQuery.length >= 3 && (
                        <p className="text-sm text-gray-400 dark:text-gray-600">No users found</p>
                      )
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Input placeholder="Search members..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="bg-gray-700 dark:bg-gray-100 text-gray-100 dark:text-gray-900 border-gray-600 dark:border-gray-300 placeholder:text-gray-400 dark:placeholder:text-gray-600" />
            <div className="space-y-3">
              {filteredMembers?.map((member) => (
                <div key={member._id} className="flex items-center justify-between p-3 border border-gray-600 dark:border-gray-300 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={member.image || "/placeholder.svg"} />
                      <AvatarFallback className="bg-gray-700 dark:bg-gray-200 text-gray-100 dark:text-gray-900">{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-100 dark:text-gray-900">{member.name}</p>
                        {isAdmin(member._id) && (
                          <Badge variant="secondary" className="text-xs bg-gray-700 dark:bg-gray-200 text-gray-100 dark:text-gray-900">
                            <Crown className="h-3 w-3 mr-1 text-yellow-400 dark:text-yellow-600" />
                            Admin
                          </Badge>
                        )}
                        {isModerator(member._id) && (
                          <Badge variant="outline" className="text-xs border-gray-600 dark:border-gray-300 text-gray-100 dark:text-gray-900">
                            <Shield className="h-3 w-3 mr-1 text-blue-400 dark:text-blue-600" />
                            Moderator
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400 dark:text-gray-600">{member.email}</p>
                    </div>
                  </div>
                  {canManage && !isAdmin(member._id) && (
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleModerator(member._id, isModerator(member._id))}
                        className="border-gray-600 dark:border-gray-300 bg-gray-800 dark:bg-gray-100 text-green-400 dark:text-blue-600 hover:bg-blue-500 dark:hover:bg-blue-700 hover:text-gray-100 dark:hover:text-gray-100"
                      >
                        {isModerator(member._id) ? "Remove Mod" : "Make Mod"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveMember(member._id)}
                        className="border-gray-600 dark:border-gray-300 bg-gray-800 dark:bg-gray-100 text-green-400 dark:text-blue-600 hover:bg-red-500 dark:hover:bg-red-700 hover:text-gray-100 dark:hover:text-gray-100"
                      >
                        <UserMinus className="h-4 w-4 text-green-400 dark:text-blue-600" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>

  );
}