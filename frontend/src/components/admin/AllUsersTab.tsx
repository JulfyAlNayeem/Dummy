// @ts-nocheck

import { useDispatch, useSelector } from "react-redux"
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Edit, Trash2, Shield, ShieldOff, Key, RefreshCw, FileText, MoreVertical } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { useGetAllUsersQuery } from "@/redux/api/admin/userManagementApi"
import { openModal, updateFilter, selectFilters } from "@/redux/slices/uiSlice"
import { cn } from "@/lib/utils"

export default function AllUsersTab(): JSX.Element {
  const dispatch = useDispatch()
  const filters: any = useSelector(selectFilters);

  const [localSearch, setLocalSearch] = useState<string>(filters.users.search || "");

  // Keep local input in sync when filters are updated externally
  useEffect(() => {
    setLocalSearch(filters.users.search || "");
  }, [filters.users.search]);

  // Debounce user input before dispatching filter update (reduces requests)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.users.search) {
        dispatch(updateFilter({ filterType: "users", updates: { search: localSearch.trim(), page: 1 } }))
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [localSearch, dispatch, filters.users.search]);

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
  }: any = useGetAllUsersQuery(filters.users)

  const handleFilterChange = (filterType: string, updates: any): void => {
    dispatch(updateFilter({ filterType, updates }))
  }

  if (usersLoading && !usersData) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="h-8 w-8 animate-spin text-white dark:text-gray-900" />
      </div>
    )
  }

  return (
    <Card className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 border-gray-700 dark:border-gray-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white dark:text-gray-900">User Management</CardTitle>
            <CardDescription className="text-gray-300 dark:text-gray-600">
              Manage all registered users
            </CardDescription>
          </div>
          <Button
            onClick={() => dispatch(openModal({ modalName: "createUser" }))}
            className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex md:flex-row flex-col md:gap-4 md:pb-0 pb-4 gap-1">
          {/* Debounced client-side search: updates filter after typing pause or on Enter */}
          <div className="flex gap-4 mb-4">
            <Input
            placeholder="Search users..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                dispatch(updateFilter({ filterType: "users", updates: { search: localSearch.trim(), page: 1 } }))
              }
            }}
            className="max-w-sm bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70"
          />
          <Button
            variant="ghost"
            onClick={() => {
              setLocalSearch("");
              dispatch(updateFilter({ filterType: "users", updates: { search: "", page: 1 } }));
            }}
            className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
            aria-label="Clear search"
          >
            Clear
          </Button>
          </div>

          <div className="flex gap-4">
            <Select
            value={filters.users.status}
            onValueChange={(value) => handleFilterChange("users", { status: value, page: 1 })}
          >
            <SelectTrigger className="w-40 bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400">
              <SelectItem value="all" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">All Status</SelectItem>
              <SelectItem value="active" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Active</SelectItem>
              <SelectItem value="inactive" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.users.role}
            onValueChange={(value) => handleFilterChange("users", { role: value, page: 1 })}
          >
            <SelectTrigger className="w-40 bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400">
              <SelectItem value="all" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">All Roles</SelectItem>
              <SelectItem value="user" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">User</SelectItem>
              <SelectItem value="moderator" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Moderator</SelectItem>
              <SelectItem value="admin" className="hover:bg-gray-900/50 dark:hover:bg-gray-300/50">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            onClick={refetchUsers}
            className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
           >
           <RefreshCw className="h-4 w-4" />
          </Button>
          </div>
           
        </div>

        {usersError && (
          <div className="bg-red-900/50 dark:bg-red-200/50 border border-red-700 dark:border-red-300 text-red-200 dark:text-red-800 mb-4 p-3 rounded">
            Error loading users: {usersError.data?.message || usersError.message}
          </div>
        )}

        <Table className="bg-gray-900/50 dark:bg-gray-300/50 border-gray-600 dark:border-gray-400">
          <TableHeader>
            <TableRow className="border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70">
              <TableHead className="text-white dark:text-gray-900">User</TableHead>
              <TableHead className="text-white dark:text-gray-900">Email</TableHead>
              <TableHead className="text-white dark:text-gray-900">Role</TableHead>
              <TableHead className="text-white dark:text-gray-900">Status</TableHead>
              <TableHead className="text-white dark:text-gray-900">Last Seen</TableHead>
              <TableHead className="text-white dark:text-gray-900">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usersData?.users?.map((user) => (
              <TableRow key={user._id} className="border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70">
                <TableCell>
                  <div className="font-medium text-white dark:text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-300 dark:text-gray-600">{user.gender}</div>
                </TableCell>
                <TableCell className="text-white dark:text-gray-900">{user.email}</TableCell>
                <TableCell>
                  <Badge
                    className="bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    className="bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400 hover:bg-gray-900/70 dark:hover:bg-gray-300/70"
                  >
                    {user.isActive ? "Active" : "Blocked"}
                  </Badge>
                </TableCell>
                <TableCell className="text-white dark:text-gray-900">
                  {user.last_seen ? new Date(user.last_seen).toLocaleDateString() : "Never"}
                </TableCell>
                <TableCell>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button size="sm" variant="ghost" className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44 p-0 bg-gray-900 border-[#374151]">
                      <div className="flex flex-col">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-start px-4 py-2 text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
                          onClick={() => dispatch(openModal({ modalName: "editUser", data: user }))}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className={cn(
                            "justify-start px-4 py-2 text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50",
                            user.fileSendingAllowed && "text-green-400 dark:text-green-600"
                          )}
                          onClick={() => dispatch(openModal({ modalName: "toggleFilePermission", data: user }))}
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          {user.fileSendingAllowed ? "Disable File Sending" : "Enable File Sending"}
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="justify-start px-4 py-2 text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
                          onClick={() => dispatch(openModal({ modalName: "resetPassword", data: user }))}
                        >
                          <Key className="h-4 w-4 mr-2" />
                          Reset Password
                        </Button>

                        {user.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start px-4 py-2 text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
                            onClick={() => dispatch(openModal({ modalName: "blockUser", data: user }))}
                          >
                            <ShieldOff className="h-4 w-4 mr-2" />
                            Block User
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start px-4 py-2 text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
                            onClick={() => dispatch(openModal({ modalName: "unblockUser", data: user }))}
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            Unblock User
                          </Button>
                        )}

                        {user.role !== "superadmin" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="justify-start px-4 py-2 text-red-500 hover:bg-red-900/10 dark:hover:bg-red-200/10"
                            onClick={() => dispatch(openModal({ modalName: "deleteUser", data: user }))}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </Button>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {usersData?.totalPages > 1 && (
          <div className="flex justify-center mt-4 space-x-2">
            <Button
              variant="ghost"
              disabled={filters.users.page <= 1}
              onClick={() => handleFilterChange("users", { page: filters.users.page - 1 })}
              className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-white dark:text-gray-900">
              Page {filters.users.page} of {usersData.totalPages}
            </span>
            <Button
              variant="ghost"
              disabled={filters.users.page >= usersData.totalPages}
              onClick={() => handleFilterChange("users", { page: filters.users.page + 1 })}
              className="text-white dark:text-gray-900 hover:bg-gray-900/50 dark:hover:bg-gray-300/50"
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}