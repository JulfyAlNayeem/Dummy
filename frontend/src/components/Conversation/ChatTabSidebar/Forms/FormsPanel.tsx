// @ts-nocheck
import { useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  ClipboardList,
  Globe,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  useGetMyFormsQuery,
  useSearchPublicFormsQuery,
  useGetAssignmentsByConversationQuery,
} from "@/redux/api/formApi";

import FormCreator from "./FormCreator";
import FormAssigner from "./FormAssigner";
import AssignmentCard from "./AssignmentCard";

/**
 * Main Forms management panel.
 * Tabs: Assignments (for this conversation), My Forms, Public Forms
 */
const FormsPanel = ({ conversationId, onClose }: any): JSX.Element => {
  const [activeTab, setActiveTab] = useState<string>('assignments');
  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [showAssigner, setShowAssigner] = useState<boolean>(false);
  const [selectedFormForAssign, setSelectedFormForAssign] = useState<any>(null);
  const [publicSearch, setPublicSearch] = useState<string>('');

  // Queries
  const { data: myFormsData, isLoading: loadingMyForms }: any =
    useGetMyFormsQuery();
  const { data: publicFormsData, isLoading: loadingPublic }: any =
    useSearchPublicFormsQuery(publicSearch);
  const { data: assignmentsData, isLoading: loadingAssignments }: any =
    useGetAssignmentsByConversationQuery(conversationId, {
      skip: !conversationId || conversationId === 'new',
    });

  const myForms = myFormsData?.forms || [];
  const publicForms = publicFormsData?.forms || [];
  const assignments = assignmentsData?.assignments || [];

  const handleAssignForm = (form) => {
    setSelectedFormForAssign(form);
    setShowAssigner(true);
  };

  const handleFormCreated = () => {
    setShowCreator(false);
  };

  const handleAssigned = () => {
    setShowAssigner(false);
    setSelectedFormForAssign(null);
    setActiveTab("assignments");
  };

  // ─── Sub-views ───

  if (showCreator) {
    return (
      <FormCreator
        onClose={() => setShowCreator(false)}
        onCreated={handleFormCreated}
      />
    );
  }

  if (showAssigner && selectedFormForAssign) {
    return (
      <FormAssigner
        form={selectedFormForAssign}
        conversationId={conversationId}
        onClose={() => {
          setShowAssigner(false);
          setSelectedFormForAssign(null);
        }}
        onAssigned={handleAssigned}
      />
    );
  }

  // ─── Main Panel ───
  return (
    <div className="flex flex-col h-full max-w-full bg-gray-900 text-gray-100">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-700">
        <Button
          variant="ghost"
          size="sm"
          className="p-2 hover:bg-white/10"
          onClick={onClose}
        >
          <ArrowLeft className="h-5 w-5 text-gray-100" />
        </Button>
        <ClipboardList className="h-5 w-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-gray-100 flex-1">Forms</h2>
        <Button
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
          onClick={() => setShowCreator(true)}
        >
          <Plus className="h-4 w-4" /> New Form
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="w-full justify-start bg-gray-800/50 border-b border-gray-700 rounded-none px-4">
          <TabsTrigger value="assignments" className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white">
            Assignments
            {assignments.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px] bg-blue-500/20 text-blue-400">
                {assignments.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="my-forms" className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white">
            My Forms
          </TabsTrigger>
          <TabsTrigger value="public" className="data-[state=active]:bg-gray-700 text-gray-300 data-[state=active]:text-white">
            Public
          </TabsTrigger>
        </TabsList>

        {/* ─── Assignments Tab ─── */}
        <TabsContent value="assignments" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
          {loadingAssignments ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading assignments...</p>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No form assignments yet</p>
              <p className="text-xs mt-1">Create a form and assign it to start</p>
            </div>
          ) : (
            assignments.map((assignment) => (
              <AssignmentCard
                key={assignment._id}
                assignment={assignment}
                conversationId={conversationId}
              />
            ))
          )}
        </TabsContent>

        {/* ─── My Forms Tab ─── */}
        <TabsContent value="my-forms" className="flex-1 overflow-y-auto p-4 space-y-2 mt-0">
          {loadingMyForms ? (
            <p className="text-gray-400 text-sm text-center py-8">Loading...</p>
          ) : myForms.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No forms created yet</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-3 border-gray-600 text-gray-600 hover:bg-gray-700"
                onClick={() => setShowCreator(true)}
              >
                <Plus className="h-4 w-4 mr-1" /> Create your first form
              </Button>
            </div>
          ) : (
            myForms.map((form) => (
              <FormListItem
                key={form._id}
                form={form}
                onAssign={() => handleAssignForm(form)}
              />
            ))
          )}
        </TabsContent>

        {/* ─── Public Forms Tab ─── */}
        <TabsContent value="public" className="flex-1 overflow-y-auto p-4 space-y-3 mt-0">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search public forms..."
              value={publicSearch}
              onChange={(e) => setPublicSearch(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-gray-100"
            />
          </div>
          {loadingPublic ? (
            <p className="text-gray-400 text-sm text-center py-8">Searching...</p>
          ) : publicForms.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-8">No public forms found</p>
          ) : (
            publicForms.map((form) => (
              <FormListItem
                key={form._id}
                form={form}
                onAssign={() => handleAssignForm(form)}
                showCreator
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ─── Form List Item (reused in My Forms & Public tabs) ───

const FormListItem = ({ form, onAssign, showCreator = false }: any): JSX.Element => (
  <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-4 py-3 hover:bg-gray-800 transition-colors">
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-gray-100 text-sm font-medium truncate">
          {form.name}
        </span>
        {form.visibility === "public" ? (
          <Globe className="h-3 w-3 text-green-400 flex-shrink-0" />
        ) : (
          <Lock className="h-3 w-3 text-yellow-400 flex-shrink-0" />
        )}
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-gray-400 text-xs">
          {form.fields?.length || 0} question{(form.fields?.length || 0) !== 1 ? "s" : ""}
        </span>
        {showCreator && form.creator?.name && (
          <span className="text-gray-500 text-xs">by {form.creator.name}</span>
        )}
      </div>
    </div>
    <Button
      size="sm"
      variant="outline"
      className="border-blue-500/50 text-blue-400 hover:bg-blue-500/10 ml-3"
      onClick={onAssign}
    >
      Assign
    </Button>
  </div>
);

export default FormsPanel;
