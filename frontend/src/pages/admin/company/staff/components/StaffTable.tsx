import * as React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, User, Phone, UserCog, Pencil, Mail } from "lucide-react";
import type { Staff } from "@/api/staff";

interface StaffTableProps {
  staff: Staff[];
  onDelete: (id: string, name: string) => void;
  onEdit: (staff: Staff) => void;
  onToggleStatus: (id: string) => void;
  onRowClick: (staff: Staff) => void;
}

export function StaffTable({ staff, onDelete, onEdit, onToggleStatus, onRowClick }: StaffTableProps) {
  return (
    <div className="overflow-x-auto">
    <Table className="min-w-[900px]">
      <TableHeader>
        <TableRow className="bg-gray-50 hover:bg-gray-50">
          <TableHead className="w-[250px]">Staff</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Phone</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {staff.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
              <div className="flex flex-col items-center justify-center gap-2">
                <UserCog className="h-8 w-8 text-gray-300" />
                <p>No staff</p>
              </div>
            </TableCell>
          </TableRow>
        ) : (
          staff.map((s) => (
            <TableRow
              key={s.id}
              className="group hover:bg-blue-50/30 transition-colors cursor-pointer"
              onClick={() => onRowClick(s)}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="font-semibold text-gray-900">{s.name || 'Unnamed'}</p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm font-medium text-slate-700">{s.role}</span>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-sm text-gray-600">
                  <Mail className="w-3 h-3 mr-1.5 text-gray-400" />
                  {s.email || '—'}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center text-sm text-gray-600">
                  <Phone className="w-3 h-3 mr-1.5 text-gray-400" />
                  {s.phone || '—'}
                </div>
              </TableCell>
              <TableCell>
                <Switch
                  checked={s.isActive}
                  onCheckedChange={(checked) => {
                    if (checked !== s.isActive) {
                      onToggleStatus(s.id);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableCell>
              <TableCell>
                <span className="text-sm text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</span>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onEdit(s); }}
                    title="Edit Staff"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    onClick={(e) => { e.stopPropagation(); onDelete(s.id, s.name || 'Staff'); }}
                    title="Remove Staff"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
    </div>
  );
}
