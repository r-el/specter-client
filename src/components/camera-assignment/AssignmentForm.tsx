import React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ICamera } from "../../@types/Camera";
import type { IUser } from "../../@types/User";

interface AssignmentFormProps {
  cameras: ICamera[];
  users: IUser[];
  selectedCamera: string;
  setSelectedCamera: (val: string) => void;
  selectedUser: string;
  setSelectedUser: (val: string) => void;
  onAssign: () => void;
  loading: boolean;
  assignments: Array<{ user_id: string }>;
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
  cameras,
  users,
  selectedCamera,
  setSelectedCamera,
  selectedUser,
  setSelectedUser,
  onAssign,
  loading,
  assignments,
}) => {
  return (
    <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Select Camera:</label>
          <Select value={selectedCamera} onValueChange={setSelectedCamera}>
            <SelectTrigger className="w-full h-10 bg-white/5 border-white/10">
              <SelectValue placeholder="Choose a camera..." />
            </SelectTrigger>
            <SelectContent>
              {cameras.map((camera) => (
                <SelectItem key={camera.id} value={camera.id}>
                  {camera.name} {camera.location ? `(${camera.location})` : ""}
                </SelectItem>
              ))}
              {cameras.length === 0 && (
                <SelectItem value="empty" disabled>
                  No cameras available. Check your permissions.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Select User to Assign:</label>
          <Select value={selectedUser} onValueChange={setSelectedUser} disabled={!selectedCamera}>
            <SelectTrigger className="w-full h-10 bg-white/5 border-white/10">
              <SelectValue placeholder="Choose a user..." />
            </SelectTrigger>
            <SelectContent>
              {users.map((user) => {
                const isAlreadyAssigned = assignments.some((a) => a.user_id === user.id);
                return (
                  <SelectItem key={user.id} value={user.id} disabled={isAlreadyAssigned}>
                    {user.name} (@{user.username}) - {user.role} {isAlreadyAssigned ? "✓" : ""}
                  </SelectItem>
                );
              })}
              {users.length === 0 && (
                <SelectItem value="empty" disabled>
                  No users available.
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onAssign} disabled={loading || !selectedCamera || !selectedUser}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? "Assigning..." : "Assign Camera"}
        </Button>
      </div>
    </div>
  );
};
