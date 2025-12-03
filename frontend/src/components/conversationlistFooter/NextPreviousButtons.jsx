import React from 'react'
import { Button } from '../ui/button'

const NextPreviousButtons = ({page,setPage, searchResult}) => {
  return (
     <div className="sticky bottom-0 bg-black/10 backdrop-blur-sm py-2 px-2 mt-4 flex flex-row items-center justify-between gap-2 pb-5">
          <Button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            variant="outline"
            className="w-auto"
          >
            Previous
          </Button>
          <p className="text-sm text-gray-400 text-center">
            Page {searchResult?.page || 1} of {searchResult?.totalPages || 1} (Total: {searchResult?.total || 0})
          </p>
          <Button
            onClick={() => setPage(page + 1)}
            disabled={page >= (searchResult?.totalPages || 1)}
            variant="outline"
            className="w-auto"
          >
            Next
          </Button>
        </div>
  )
}

export default NextPreviousButtons
