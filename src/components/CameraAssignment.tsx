import React, { useState, useEffect, useCallback } from "react";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  getAllCameras,
  assignCameraToUser,
  getCameraAssignments,
  removeCameraAssignment,
} from "../services/cameraService";
import { getAllUsers } from "../services/userService";
import { useAuth } from "../context/AuthContext";
import type { ICamera } from "../@types/Camera";
import type { IUser } from "../@types/User";
import { ShieldAlert } from "lucide-react";

import { AssignmentForm } from "./camera-assignment/AssignmentForm";
import { AssignedUsersList, type AssignmentRecord } from "./camera-assignment/AssignedUsersList";
import { PermissionsInfo } from "./camera-assignment/PermissionsInfo";

const CameraAssignment: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [cameras, setCameras] = useState<ICamera[]>([]);
  const [users, setUsers] = useState<IUser[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const loadCameras = useCallback(async () => {
    try {
      const response = await getAllCameras();
      if (response.success && response.data) {
        setCameras(response.data);
      } else {
        setError(response.error || "Failed to load cameras");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load cameras", { forbidden: "No permission to view cameras." }));
    }
  }, []);

  const loadUsers = useCallback(async () => {
    try {
      const response = await getAllUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        setError(response.error || "Failed to load users");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load users", { forbidden: "No permission to view users." }));
    }
  }, []);

  const loadAssignmentsForCamera = useCallback(async (cameraId: string) => {
    if (!cameraId) {
      setAssignments([]);
      return;
    }
    try {
      setLoadingAssignments(true);
      const response = await getCameraAssignments(cameraId);
      if (response.success && Array.isArray(response.data)) {
        setAssignments(response.data as AssignmentRecord[]);
      } else {
        setAssignments([]);
      }
    } catch (err) {
      const msg = getApiErrorMessage(err, "Failed to load camera assignments");
      if (msg.includes("camera_assignments") || msg.includes("schema cache")) {
        setError("Supabase table 'camera_assignments' is missing. Please run camera_assignments_table.sql in Supabase.");
      }
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    void loadCameras();
    void loadUsers();
  }, [loadCameras, loadUsers]);

  useEffect(() => {
    if (selectedCamera) {
      void loadAssignmentsForCamera(selectedCamera);
    } else {
      setAssignments([]);
    }
  }, [selectedCamera, loadAssignmentsForCamera]);

  const handleAssignCamera = async () => {
    if (!selectedCamera || !selectedUser) {
      setError("Please select both camera and user");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const response = await assignCameraToUser(selectedCamera, selectedUser);
      if (response.success) {
        setSuccess("Camera assigned successfully!");
        setSelectedUser("");
        await loadAssignmentsForCamera(selectedCamera);
      } else {
        setError(response.error || "Failed to assign camera");
      }
    } catch (err) {
      const message = getApiErrorMessage(err, "Failed to assign camera", {
        forbidden: "Only the camera creator or an admin can manage its assignments.",
      });
      if (message.includes("camera_assignments") || message.includes("schema cache")) {
        setError("Database table 'camera_assignments' is missing in Supabase. Run dashboard/docs/db/supabase/camera_assignments_table.sql to create it.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAssignment = async (userId: string) => {
    if (!selectedCamera) return;

    try {
      setRemovingUserId(userId);
      setError("");
      setSuccess("");

      const response = await removeCameraAssignment(selectedCamera, userId);
      if (response.success) {
        setSuccess("Camera assignment removed successfully!");
        await loadAssignmentsForCamera(selectedCamera);
      } else {
        setError(response.error || "Failed to remove camera assignment");
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to remove assignment", {
        forbidden: "Only the camera creator or an admin can manage its assignments.",
      }));
    } finally {
      setRemovingUserId(null);
    }
  };

  const selectedCameraObj = cameras.find((c) => c.id === selectedCamera);

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-semibold mb-2">Camera Assignment</h2>
        <p className="text-sm text-muted-foreground mb-6">
          Grant specific users access to view cameras. Admins can assign any camera, and operators can assign cameras they created.
        </p>

        {error && (
          <div className="mb-6 p-4 rounded-xl border border-rose-500/20 bg-rose-500/10 text-rose-400 flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="text-sm">{error}</div>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-sm">
            {success}
          </div>
        )}

        <AssignmentForm
          cameras={cameras}
          users={users}
          selectedCamera={selectedCamera}
          setSelectedCamera={setSelectedCamera}
          selectedUser={selectedUser}
          setSelectedUser={setSelectedUser}
          onAssign={handleAssignCamera}
          loading={loading}
          assignments={assignments}
        />

        {selectedCamera && (
          <AssignedUsersList
            assignments={assignments}
            users={users}
            loadingAssignments={loadingAssignments}
            selectedCameraName={selectedCameraObj?.name || "Selected Camera"}
            currentUserRole={currentUser?.role}
            removingUserId={removingUserId}
            onRemoveAssignment={handleRemoveAssignment}
          />
        )}
      </div>

      <PermissionsInfo />
    </div>
  );
};

export default CameraAssignment;

