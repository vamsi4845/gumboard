export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

export interface Note {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  checklistItems?: ChecklistItem[];
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  board?: {
    id: string;
    name: string;
  };
  // Optional positioning properties for board layout
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

export interface Board {
  id: string;
  name: string;
  description: string | null;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  isAdmin?: boolean;
}

// For demo components - simpler structure
export interface DemoTask {
  id: number;
  text: string;
  completed: boolean;
}

export interface DemoNote {
  id: number;
  author: {
    name: string;
    initial: string;
  };
  color: string;
  tasks: DemoTask[];
}