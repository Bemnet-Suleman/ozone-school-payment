import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useGetMe, 
  useListStudents, 
  useListUsers, 
  useCreateStudent, 
  useLinkStudentToParent,
  getListStudentsQueryKey,
  getListUsersQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

import { useAuthStore } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, LogOut, Settings, Users, UserPlus, Link as LinkIcon } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const createStudentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  grade: z.string().min(1, "Grade is required"),
  section: z.string().min(1, "Section is required"),
});

const linkStudentSchema = z.object({
  studentId: z.string().min(1, "Student is required"),
  parentId: z.string().min(1, "Parent is required"),
});

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { setToken } = useAuthStore();
  const { toast } = useToast();
  const queryClient = useQueryClient();


  const { data: user, isLoading: isLoadingUser } = useGetMe({ query: { retry: false } });
  
  const { data: students, isLoading: isLoadingStudents } = useListStudents({
    query: {
      enabled: !!user,
      queryKey: getListStudentsQueryKey()
    }
  });

  const { data: users, isLoading: isLoadingUsers } = useListUsers({
    query: {
      enabled: !!user,
      queryKey: getListUsersQueryKey()
    }
  });

  const createStudentMutation = useCreateStudent();
  const linkMutation = useLinkStudentToParent();

  const createStudentForm = useForm<z.infer<typeof createStudentSchema>>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: { name: "", grade: "", section: "" },
  });

  const linkForm = useForm<z.infer<typeof linkStudentSchema>>({
    resolver: zodResolver(linkStudentSchema),
    defaultValues: { studentId: "", parentId: "" },
  });

  useEffect(() => {
    if (!isLoadingUser && (!user || user.role !== "admin")) {
      setLocation("/");
    }
  }, [user, isLoadingUser, setLocation]);

  const handleLogout = () => {
    queryClient.clear();
    setToken(null);
    setLocation("/");
  };

  const onCreateStudent = (values: z.infer<typeof createStudentSchema>) => {
    createStudentMutation.mutate(
      { data: values },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Student created successfully." });
          createStudentForm.reset();
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        }
      }
    );
  };

  const onLinkStudent = (values: z.infer<typeof linkStudentSchema>) => {
    linkMutation.mutate(
      { data: { studentId: parseInt(values.studentId), parentId: parseInt(values.parentId) } },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Student linked to parent successfully." });
          linkForm.reset();
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        }
      }
    );
  };

  if (isLoadingUser || !user) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const parentUsers = users?.filter(u => u.role === "parent") || [];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="bg-sidebar-primary text-sidebar-primary-foreground py-4 px-6 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-6 w-6" />
            <h1 className="text-xl font-bold tracking-tight">Admin Portal</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium opacity-90">{user.name}</span>
            <Button variant="secondary" size="sm" onClick={handleLogout} className="bg-white/10 hover:bg-white/20 text-white border-0">
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-8 mt-4">
        
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5"/> Create Student</CardTitle>
              <CardDescription>Add a new student to the system registry</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...createStudentForm}>
                <form onSubmit={createStudentForm.handleSubmit(onCreateStudent)} className="space-y-4">
                  <FormField
                    control={createStudentForm.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={createStudentForm.control}
                      name="grade"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade</FormLabel>
                          <FormControl><Input placeholder="10" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createStudentForm.control}
                      name="section"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Section</FormLabel>
                          <FormControl><Input placeholder="A" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={createStudentMutation.isPending}>
                    {createStudentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Student
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><LinkIcon className="h-5 w-5"/> Link Parent & Student</CardTitle>
              <CardDescription>Assign a student to their parent/guardian's account</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...linkForm}>
                <form onSubmit={linkForm.handleSubmit(onLinkStudent)} className="space-y-4">
                  <FormField
                    control={linkForm.control}
                    name="studentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Student</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select student" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {students?.map(s => (
                              <SelectItem key={s.id} value={s.id.toString()}>{s.name} ({s.grade}-{s.section})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={linkForm.control}
                    name="parentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parent / Guardian</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select parent" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {parentUsers.map(p => (
                              <SelectItem key={p.id} value={p.id.toString()}>{p.name} ({p.email})</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={linkMutation.isPending}>
                    {linkMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Link Accounts
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Student Directory</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingStudents ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Parent Link</TableHead>
                      <TableHead>Registered</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {students?.map(s => (
                      <TableRow key={s.id}>
                        <TableCell className="font-mono text-xs">{s.id}</TableCell>
                        <TableCell className="font-medium">{s.name}</TableCell>
                        <TableCell>{s.grade} - {s.section}</TableCell>
                        <TableCell>
                          {s.parentId ? (
                            <span className="text-green-600 font-medium text-sm">Linked: {s.parentName}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm italic">Unlinked</span>
                          )}
                        </TableCell>
                        <TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {!students?.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No students found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
