import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { debounce } from "lodash";
import { Input, Button, Avatar, AvatarImage, AvatarFallback } from "./ui"; // Adjust imports
import { useSearchUserQuery, useAddMemberMutation } from "../api/userApi"; // Adjust import

const MemberSearch = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10; // Matches backend default
  const dispatch = useDispatch();
  const [addMember] = useAddMemberMutation();

  // Debounce the search query
  const debounceSearch = debounce((value) => {
    setDebouncedQuery(value);
    setPage(1); // Reset to page 1 on new search
  }, 300);

  useEffect(() => {
    debounceSearch(searchQuery);
    return () => debounceSearch.cancel();
  }, [searchQuery]);

  const { data: searchResult, isLoading: isSearching } = useSearchUserQuery(
    { query: debouncedQuery, page, limit },
    {
      skip: !debouncedQuery || debouncedQuery.length < 3,
    }
  );

  const handleAddMember = async (user) => {
    try {
      await addMember({ email: user.email }).unwrap();
    //   dispatch(
    //     addToast({
    //       title: "Success",
    //       description: `${user.name} added successfully`,
    //       type: "success",
    //     })
    //   );
      setSearchQuery(""); // Clear input
      setPage(1); // Reset to page 1
    } catch (error) {
    //   dispatch(
    //     addToast({
    //       title: "Error",
    //       description: "Failed to add user",
    //       type: "error",
    //     })
    //   );
    }
  };

  const handlePreviousPage = () => {
    if (page > 1) setPage(page - 1);
  };

  const handleNextPage = () => {
    if (searchResult && page < searchResult.totalPages) setPage(page + 1);
  };

  return (
    <div className="space-y-4">
      <Input
        placeholder="Enter name or email (use @ for email)"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {isSearching && <p className="text-sm text-muted-foreground">Searching...</p>}
      {searchResult?.users?.length > 0 ? (
        <div className="space-y-2">
          {searchResult.users.map((user) => (
            <div key={user.email} className="p-3 border rounded-lg">
              <div className="flex items-center justify-between space-x-3">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.image || "/placeholder.svg"} />
                    <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                </div>
                <Button onClick={() => handleAddMember(user)}>Add Member</Button>
              </div>
            </div>
          ))}
          <div className="flex justify-between mt-4">
            <Button
              onClick={handlePreviousPage}
              disabled={page === 1}
              variant="outline"
            >
              Previous
            </Button>
            <p className="text-sm text-muted-foreground">
              Page {searchResult?.page || 1} of {searchResult?.totalPages || 1} (Total: {searchResult?.total || 0})
            </p>
            <Button
              onClick={handleNextPage}
              disabled={page >= (searchResult?.totalPages || 1)}
              variant="outline"
            >
              Next
            </Button>
          </div>
        </div>
      ) : (
        !isSearching &&
        debouncedQuery.length >= 3 && (
          <p className="text-sm text-muted-foreground">No users found</p>
        )
      )}
    </div>
  );
};

export default MemberSearch;