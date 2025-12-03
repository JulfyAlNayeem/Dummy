import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CheckCircle, XCircle, User, Calendar, Mail, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from "@/lib/utils"

export function ApprovalCard({ approval, onApprove, onReject }) {
  const [approveNotes, setApproveNotes] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [isApproving, setIsApproving] = useState(false)
  const [isRejecting, setIsRejecting] = useState(false)

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      await onApprove({ approvalId: approval._id, notes: approveNotes })
      setApproveNotes('')
    } finally {
      setIsApproving(false)
    }
  }

  const handleReject = async () => {
    setIsRejecting(true)
    try {
      await onReject({ approvalId: approval._id, reason: rejectReason })
      setRejectReason('')
    } finally {
      setIsRejecting(false)
    }
  }

  const getRiskColor = (score) => {
    if (score >= 70) return 'text-red-500 dark:text-red-400'
    if (score >= 40) return 'text-yellow-500 dark:text-yellow-400'
    return 'text-green-500 dark:text-green-400'
  }

  return (
    <Card className={cn(
      "border-gray-700 dark:border-gray-300 bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 hover:bg-gradient-to-b hover:from-gray-750 hover:to-gray-650 dark:hover:from-gray-250 dark:hover:to-gray-150 transition-colors"
    )}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={approval.user?.avatar} />
              <AvatarFallback className="bg-gray-900 dark:bg-gray-300 text-white dark:text-gray-900">
                {approval.user?.name?.split(' ').map(n => n[0]).join('') || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg text-white dark:text-gray-900">{approval.user?.name}</CardTitle>
              <CardDescription className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
                <Mail className="w-3 h-3" />
                {approval.user?.email}
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge className="border-gray-600 dark:border-gray-400 bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900">
              {approval.status}
            </Badge>
            {approval.risk_score > 0 && (
              <div className="flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-yellow-500 dark:text-yellow-400" />
                <span className={cn("text-xs font-medium", getRiskColor(approval.risk_score))}>
                  Risk: {approval.risk_score}%
                </span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
              <User className="w-3 h-3" />
              <span>Gender: {approval.user?.gender || 'Not specified'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-300 dark:text-gray-600">
              <Calendar className="w-3 h-3" />
              <span>Requested: {format(new Date(approval.requested_at), 'MMM d, yyyy')}</span>
            </div>
          </div>

          {approval.risk_factors && approval.risk_factors.length > 0 && (
            <div>
              <p className="text-sm font-medium text-white dark:text-gray-900 mb-2">Risk Factors:</p>
              <div className="flex flex-wrap gap-1">
                {approval.risk_factors.map((factor, index) => (
                  <Badge 
                    key={index} 
                    className="bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 hover:bg-gray-900/70 dark:hover:bg-gray-300/70"
                  >
                    {factor}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4 border-t border-gray-700 dark:border-gray-300">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  className={cn(
                    "flex-1 text-white dark:text-gray-900 bg-green-600 hover:bg-green-600/90 dark:bg-green-400 dark:hover:bg-green-400/90",
                    "hover:bg-green-700 dark:hover:bg-green-500"
                  )}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300">
                <DialogHeader>
                  <DialogTitle className="text-white dark:text-gray-900">Approve User</DialogTitle>
                  <DialogDescription className="text-gray-300 dark:text-gray-600">
                    Approve {approval.user?.name} for platform access. You can add optional notes.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="notes" className="text-white dark:text-gray-900">Approval Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional notes about this approval..."
                      value={approveNotes}
                      onChange={(e) => setApproveNotes(e.target.value)}
                      className="bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleApprove} 
                    disabled={isApproving}
                    className="bg-green-600 hover:bg-green-700 dark:bg-green-400 dark:hover:bg-green-500 text-white dark:text-gray-900"
                  >
                    {isApproving ? 'Approving...' : 'Approve User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  className={cn(
                    "flex-1 text-white dark:text-gray-900 bg-red-600 hover:bg-red-700 dark:bg-red-400 dark:hover:bg-red-500"
                  )}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-gradient-to-b from-gray-800 to-gray-700 dark:from-gray-200 dark:to-gray-100 text-white dark:text-gray-900 border-gray-700 dark:border-gray-300">
                <DialogHeader>
                  <DialogTitle className="text-white dark:text-gray-900">Reject User</DialogTitle>
                  <DialogDescription className="text-gray-300 dark:text-gray-600">
                    Reject {approval.user?.name}'s application. Please provide a reason.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason" className="text-white dark:text-gray-900">Rejection Reason *</Label>
                    <Textarea
                      id="reason"
                      placeholder="Please provide a reason for rejection..."
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      required
                      className="bg-gray-900/50 dark:bg-gray-300/50 text-white dark:text-gray-900 border-gray-600 dark:border-gray-400"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button 
                    onClick={handleReject} 
                    disabled={isRejecting || !rejectReason.trim()}
                    className="bg-red-600 hover:bg-red-700 dark:bg-red-400 dark:hover:bg-red-500 text-white dark:text-gray-900"
                  >
                    {isRejecting ? 'Rejecting...' : 'Reject User'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}