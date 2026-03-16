
import { useState, useEffect } from "react";
import { CheckSquare, Plus, Trash2, Calendar, Mail, Phone, MapPin, GripVertical, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Task {
    id: string;
    text: string;
    completed: boolean;
    dueDate?: string;
    meta?: {
        email?: string;
        mobile?: string;
        region?: string;
        status?: string;
        sapBpId?: string;
    };
}

export default function MyTasks() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTask, setNewTask] = useState("");
    const [newTaskDate, setNewTaskDate] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Load tasks function
    const loadTasks = () => {
        const savedTasks = localStorage.getItem("dashboard_my_tasks");
        if (savedTasks) {
            try {
                setTasks(JSON.parse(savedTasks));
            } catch (e) {

            }
        } else {
            // Add some default tasks for first-time users
            setTasks([
                { id: "1", text: "Follow up with new leads", completed: false, dueDate: new Date().toISOString() },
                { id: "2", text: "Review weekly report", completed: true, dueDate: new Date().toISOString() },
            ]);
        }
    };

    // Initial load and event listener
    useEffect(() => {
        loadTasks();

        const handleStorageChange = () => loadTasks();
        window.addEventListener("dashboard_my_tasks_updated", handleStorageChange);

        return () => {
            window.removeEventListener("dashboard_my_tasks_updated", handleStorageChange);
        };
    }, []);

    // Save tasks to local storage whenever they change
    useEffect(() => {
        localStorage.setItem("dashboard_my_tasks", JSON.stringify(tasks));
    }, [tasks]);

    const handleAddTask = () => {
        if (!newTask.trim()) return;

        const task: Task = {
            id: Date.now().toString(),
            text: newTask,
            completed: false,
            dueDate: newTaskDate || undefined,
        };

        setTasks([task, ...tasks]);
        setNewTask("");
        setNewTaskDate("");
        setIsDialogOpen(false);
        toast({ description: "Task added successfully" });
    };

    const toggleTask = (id: string) => {
        setTasks(tasks.map(t =>
            t.id === id ? { ...t, completed: !t.completed } : t
        ));
    };

    const deleteTask = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTasks(tasks.filter(t => t.id !== id));
        toast({ description: "Task deleted" });
    };

    // Sort tasks: Incomplete first, then by date (if exists)
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed === b.completed) return 0;
        return a.completed ? 1 : -1;
    });

    return (
        <Card className="border-0 shadow-lg h-full flex flex-col">
            <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-azam-blue" />
                    My Tasks
                </CardTitle>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button size="sm" className="h-8 gap-1 bg-azam-blue hover:bg-blue-700">
                            <Plus className="h-3.5 w-3.5" />
                            Add Task
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add New Task</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Task Description</label>
                                <Input
                                    placeholder="What needs to be done?"
                                    value={newTask}
                                    onChange={(e) => setNewTask(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Due Date (Optional)</label>
                                <Input
                                    type="date"
                                    value={newTaskDate}
                                    onChange={(e) => setNewTaskDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleAddTask} disabled={!newTask.trim()}>Add Task</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden pt-2">
                <ScrollArea className="h-[350px] pr-4">
                    {sortedTasks.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 py-8">
                            <CheckSquare className="h-12 w-12 mb-2 opacity-20" />
                            <p className="text-sm">No tasks yet. Add one to get started!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sortedTasks.map((task) => (
                                <div
                                    key={task.id}
                                    className={`group flex items-start justify-between p-3 rounded-lg border transition-all duration-200
                    ${task.completed ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-100 hover:border-blue-200 hover:shadow-sm'}
                  `}
                                >
                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                        <Checkbox
                                            checked={task.completed}
                                            onCheckedChange={() => toggleTask(task.id)}
                                            className={`mt-1 data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500`}
                                        />
                                        <div className="flex flex-col min-w-0 w-full space-y-1">
                                            <span className={`text-sm font-medium ${task.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                                {task.text}
                                            </span>

                                            {/* Task Metadata */}
                                            {task.meta && (task.meta.email || task.meta.mobile || task.meta.region) && (
                                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-[11px] ${task.completed ? 'opacity-50' : ''}`}>
                                                    {task.meta.email && (
                                                        <div className="flex items-center text-gray-500">
                                                            <Mail className="h-3 w-3 mr-1.5 text-gray-400" />
                                                            <span className="truncate">{task.meta.email}</span>
                                                        </div>
                                                    )}
                                                    {task.meta.mobile && (
                                                        <div className="flex items-center text-gray-500">
                                                            <Phone className="h-3 w-3 mr-1.5 text-gray-400" />
                                                            <span>{task.meta.mobile}</span>
                                                        </div>
                                                    )}
                                                    {task.meta.region && (
                                                        <div className="flex items-center text-gray-500">
                                                            <MapPin className="h-3 w-3 mr-1.5 text-gray-400" />
                                                            <span>{task.meta.region}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {task.dueDate && (
                                                <span className={`text-[10px] flex items-center pt-1 ${task.completed ? 'text-gray-300' : 'text-gray-400'}`}>
                                                    <Calendar className="w-3 h-3 mr-1.5" />
                                                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                                </span>
                                            )}
                                            {task.meta?.sapBpId && (
                                                <span className={`text-[10px] flex items-center pt-1 ${task.completed ? 'text-gray-300' : 'text-gray-400'}`}>
                                                    <CreditCard className="w-3 h-3 mr-1.5" />
                                                    {task.meta.sapBpId}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                                        onClick={(e) => deleteTask(task.id, e)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
