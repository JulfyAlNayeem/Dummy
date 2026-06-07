// @ts-nocheck
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ClipboardList,
  Plus,
  FileText,
  CalendarDays,
  Globe,
  Lock,
  Users,
  Search,
  Archive,
  ArrowLeft,
} from "lucide-react";
import {
  useGetMyAssignmentsQuery,
  useGetMyFormsQuery,
  useSearchPublicFormsQuery,
  useArchiveFormMutation,
} from "@/redux/api/formApi";
import FormFiller from "@/components/Conversation/ChatTabSidebar/Forms/FormFiller";
import CalendarStatus from "@/components/Conversation/ChatTabSidebar/Forms/CalendarStatus";
import FormCreator from "@/components/Conversation/ChatTabSidebar/Forms/FormCreator";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/admin/DashboardLayout";

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Daily",
  weekly: "Weekly",
  "bi-weekly": "Bi-weekly",
  bi_weekly: "Bi-weekly",
  monthly: "Monthly",
};

type ViewState = "list" | "fill" | "calendar" | "create";

export default function FormsPage(): JSX.Element {
  const navigate = useNavigate();
  const [view, setView] = useState<ViewState>("list");
  const [selectedAssignment, setSelectedAssignment] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("assigned");
  const [publicSearch, setPublicSearch] = useState<string>("");

  const { data: assignmentsData, isLoading: loadingAssigned } =
    useGetMyAssignmentsQuery();
  const { data: myFormsData, isLoading: loadingForms, refetch: refetchForms } =
    useGetMyFormsQuery();
  const { data: publicFormsData, isLoading: loadingPublic } =
    useSearchPublicFormsQuery(publicSearch);
  const [archiveForm] = useArchiveFormMutation();

  const assignments = assignmentsData?.assignments || [];
  const myForms = myFormsData?.forms || [];
  const publicForms = publicFormsData?.forms || [];

  const handleFillForm = (assignment: any) => {
    setSelectedAssignment(assignment);
    setView("fill");
  };

  const handleCalendar = (assignment: any) => {
    setSelectedAssignment(assignment);
    setView("calendar");
  };

  const handleBack = () => {
    setView("list");
    setSelectedAssignment(null);
  };

  const handleArchive = async (formId: string) => {
    try {
      await archiveForm(formId).unwrap();
      toast.success("Form archived");
    } catch {
      toast.error("Failed to archive form");
    }
  };

  // ─── Sub-views rendered full-screen ───
  if (view === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
        <FormCreator
          onClose={handleBack}
          onCreated={() => {
            handleBack();
            refetchForms();
          }}
        />
      </div>
    );
  }

  if (view === "fill" && selectedAssignment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
        <FormFiller assignment={selectedAssignment} onClose={handleBack} />
      </div>
    );
  }

  if (view === "calendar" && selectedAssignment) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white p-6">
        <CalendarStatus assignment={selectedAssignment} onClose={handleBack} />
      </div>
    );
  }

  // ─── Main List View ───
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <div className="container mx-auto p-6 space-y-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-white/10 p-2"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <ClipboardList className="h-7 w-7 text-blue-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Forms</h1>
              <p className="text-gray-400 text-sm">Manage forms and assignments</p>
            </div>
          </div>
          <Button
            className="bg-blue-600 hover:bg-blue-700 gap-2"
            onClick={() => setView("create")}
          >
            <Plus className="h-4 w-4" /> New Form
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-gray-800 border border-gray-700 w-full justify-start">
            <TabsTrigger
              value="assigned"
              className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white"
            >
              Assigned to Me
              {assignments.length > 0 && (
                <Badge className="ml-2 bg-blue-600 text-white text-xs px-1.5 py-0">
                  {assignments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="my-forms"
              className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white"
            >
              My Forms
              {myForms.length > 0 && (
                <Badge className="ml-2 bg-gray-600 text-gray-300 text-xs px-1.5 py-0">
                  {myForms.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="public"
              className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white"
            >
              Public
            </TabsTrigger>
          </TabsList>

          {/* ─── Assigned to Me ─── */}
          <TabsContent value="assigned" className="mt-4 space-y-3">
            {loadingAssigned ? (
              <div className="text-center py-16 text-gray-400">Loading...</div>
            ) : assignments.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No form assignments yet</p>
              </div>
            ) : (
              assignments.map((assignment: any) => (
                <AssignmentRow
                  key={assignment._id}
                  assignment={assignment}
                  onFill={() => handleFillForm(assignment)}
                  onCalendar={() => handleCalendar(assignment)}
                />
              ))
            )}
          </TabsContent>

          {/* ─── My Forms ─── */}
          <TabsContent value="my-forms" className="mt-4 space-y-3">
            {loadingForms ? (
              <div className="text-center py-16 text-gray-400">Loading...</div>
            ) : myForms.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No forms created yet</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4 border-blue-500/50 text-blue-400 hover:bg-blue-500/10"
                  onClick={() => setView("create")}
                >
                  <Plus className="h-4 w-4 mr-1" /> Create your first form
                </Button>
              </div>
            ) : (
              myForms.map((form: any) => (
                <FormRow
                  key={form._id}
                  form={form}
                  onArchive={() => handleArchive(form._id)}
                />
              ))
            )}
          </TabsContent>

          {/* ─── Public Forms ─── */}
          <TabsContent value="public" className="mt-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search public forms..."
                value={publicSearch}
                onChange={(e) => setPublicSearch(e.target.value)}
                className="pl-9 bg-gray-800 border-gray-700 text-gray-100"
              />
            </div>
            {loadingPublic ? (
              <div className="text-center py-8 text-gray-400">Searching...</div>
            ) : publicForms.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-40" />
                <p className="text-sm">No public forms found</p>
              </div>
            ) : (
              publicForms.map((form: any) => (
                <FormRow key={form._id} form={form} showCreator />
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Assignment Row ───

function AssignmentRow({ assignment, onFill, onCalendar }: any): JSX.Element {
  const form = assignment.form;
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <FileText className="h-4 w-4 text-blue-400 flex-shrink-0" />
          <span className="text-white font-medium truncate">{form?.name || "Form"}</span>
          <Badge
            variant="outline"
            className="border-gray-600 text-gray-400 text-[10px] px-1.5 py-0"
          >
            {FREQUENCY_LABELS[assignment.frequency] || assignment.frequency}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Users className="h-3 w-3" />
          <span>by {assignment.assignedBy?.name || "Unknown"}</span>
          {form?.fields?.length > 0 && (
            <span>
              • {form.fields.length} question{form.fields.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <Button
          size="sm"
          variant="outline"
          className="border-gray-600 text-gray-300 hover:bg-gray-700 gap-1 text-xs"
          onClick={onCalendar}
        >
          <CalendarDays className="h-3.5 w-3.5" /> Calendar
        </Button>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs"
          onClick={onFill}
        >
          <FileText className="h-3.5 w-3.5" /> Fill
        </Button>
      </div>
    </div>
  );
}

// ─── Form Row ───

function FormRow({ form, onArchive, showCreator = false }: any): JSX.Element {
  return (
    <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg p-4 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {form.visibility === "public" ? (
            <Globe className="h-4 w-4 text-green-400 flex-shrink-0" />
          ) : (
            <Lock className="h-4 w-4 text-yellow-400 flex-shrink-0" />
          )}
          <span className="text-white font-medium truncate">{form.name}</span>
        </div>
        <div className="text-xs text-gray-400">
          {form.fields?.length || 0} question{(form.fields?.length || 0) !== 1 ? "s" : ""}
          {showCreator && form.creator?.name && (
            <span> • by {form.creator.name}</span>
          )}
        </div>
      </div>
      {onArchive && (
        <Button
          size="sm"
          variant="ghost"
          className="text-red-400 hover:bg-red-500/10 text-xs gap-1 flex-shrink-0"
          onClick={onArchive}
        >
          <Archive className="h-3.5 w-3.5" /> Archive
        </Button>
      )}
    </div>
  );
}
