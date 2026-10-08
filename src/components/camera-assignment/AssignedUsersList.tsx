import React from "react";
import { Loader2, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { IUser } from "../../@types/User";

export interface AssignmentRecord {
  id?: string;
  camera_id: string;
  user_id: string;
  assigned_by?: string;
  assigned_at?: string;
}

interface AssignedUsersListProps {
  assignments: AssignmentRecord[];
  users: IUser[];
  loadingAssignments: boolean;
  selectedCameraName: string;
  currentUserRole?: string;
  removingUserId: string | null;
  onRemoveAssignment: (userId: string) => void;
}

export const AssignedUsersList: React.FC<AssignedUsersListProps> = ({
  assignments,
  users,
  loadingAssignments,
  selectedCameraName,
  currentUserRole,
  removingUserId,
  onRemoveAssignment,
}) => {
  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <UserCheck className="h-5 w-5 text-primary" />
          Assigned Users for {selectedCameraName}
        </h3>
        {loadingAssignments && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {assignments.length === 0 && !loadingAssignments ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm text-muted-foreground">
          No users are explicitly assigned to this camera yet.
          {currentUserRole === "admin" && (
            <p className="mt-1 text-xs opacity-75">
              (Administrators always have access to all cameras automatically.)
            </p>
          )}
        </div>
      ) : (
        <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-white/5 overflow-hidden">
          {assignments.map((assignment) => {
            const targetUser = users.find((u) => u.id === assignment.user_id);
            const isRemoving = removingUserId === assignment.user_id;

            return (
              <div
                key={assignment.id || assignment.user_id}
                className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
              >
                <div>
                  <div className="font-medium text-sm text-foreground">
                    {targetUser ? targetUser.name : `User (${assignment.user_id})`}
                  </div>
                  <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                    {targetUser && <span>@{targetUser.username}</span>}
                    {targetUser && <span className="capitalize">{targetUser.role}</span>}
                    {assignment.assigned_at && (
                      <span>Assigned: {new Date(assignment.assigned_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                  disabled={isRemoving}
                  onClick={() => onRemoveAssignment(assignment.user_id)}
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Remove
                    </>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
