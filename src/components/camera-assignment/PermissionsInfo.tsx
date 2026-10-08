import React from "react";

export const PermissionsInfo: React.FC = () => {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 mt-8">
      <h3 className="text-base font-medium mb-3">Permissions & Access Rules</h3>
      <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-2">
        <li>
          <strong className="text-foreground">Admin:</strong> Has access to all cameras automatically and can assign any camera to any user.
        </li>
        <li>
          <strong className="text-foreground">Operator:</strong> Can view and manage cameras they created or cameras assigned to them. Operators can assign access for cameras they created.
        </li>
        <li>
          <strong className="text-foreground">Viewer:</strong> Can only view cameras specifically assigned to them. Viewers cannot manage cameras or assignments.
        </li>
      </ul>
    </div>
  );
};
