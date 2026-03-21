import { useState, useEffect} from 'react'
import '../App.css'
export  default function Sample(){


  const [tasks, setTasks] = useState([
    { id: 1, name: 'Task A', description: 'First Task', status: 'open', dependsOn: null, editing: false },
    { id: 2, name: 'Task B', description: 'Second Task', status: 'open', dependsOn: 1, editing: false },
    { id: 3, name: 'Task C', description: 'Third Task', status: 'open', dependsOn: 2, editing: false }
  ]);

  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskDep, setNewTaskDep] = useState('');

  const changeStatus = (taskId, newStatus) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, status: newStatus } : task
      )
    );
  };

  const handleDelete = (taskId) => {
    if (window.confirm("Are you sure?")) {
      setTasks(prev => prev.filter(task => task.id !== taskId));
    }
  };

  const addTask = () => {
    if (!newTaskName.trim()) return;

    const newTask = {
      id: Date.now(),
      name: newTaskName,
      description: newTaskDesc,
      status: 'open',
      dependsOn: newTaskDep ? Number(newTaskDep) : null,
      editing: false
    };

    setTasks(prev => [...prev, newTask]);
    setNewTaskName('');
    setNewTaskDesc('');
    setNewTaskDep('');
  };

  const canStartTask = (task) => {
    if (!task.dependsOn) return true;
    const dependency = tasks.find(t => t.id === task.dependsOn);
    return dependency?.status === 'done';
  };

  const toggleEdit = (taskId) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, editing: !task.editing } : task
      )
    );
  };

  const saveDescription = (taskId, newDesc) => {
    setTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, description: newDesc, editing: false } : task
      )
    );
  };

  return (
    <div className="overall-div">
      <h1>List of Tasks</h1>

      {/* Add Task Form */}
      <div style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Task name"
          value={newTaskName}
          onChange={(e) => setNewTaskName(e.target.value)}
        />
        <input
          type="text"
          placeholder="Task description"
          value={newTaskDesc}
          onChange={(e) => setNewTaskDesc(e.target.value)}
        />
        <select
          value={newTaskDep}
          onChange={(e) => setNewTaskDep(e.target.value)}
        >
          <option value="">No dependency</option>
          {tasks.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <button onClick={addTask}>Add Task</button>
      </div>

      {/* Task Cards */}
      {tasks.map(task => {
        const allowed = canStartTask(task);
        const dependency = tasks.find(t => t.id === task.dependsOn);

        return (
          <div className="task-card" key={task.id}>
            <h2>{task.name}</h2>

            {task.editing ? (
              <div>
                <input
                  type="text"
                  defaultValue={task.description}
                  onBlur={(e) => saveDescription(task.id, e.target.value)}
                />
                <button onClick={() => toggleEdit(task.id)}>Cancel</button>
              </div>
            ) : (
              <p>{task.description}</p>
            )}

            {dependency && (
              <p><em>Depends on: {dependency.name} ({dependency.status})</em></p>
            )}
            <p>
              Status: <span className={`status-${task.status}`}>
                {task.status.toUpperCase()}
              </span>
            </p>

            <div className="actions">
              {task.status !== 'done' ? (
                <>
                  <button disabled={!allowed} onClick={() => changeStatus(task.id, 'open')}>Open</button>
                  <button disabled={!allowed} onClick={() => changeStatus(task.id, 'ongoing')}>Ongoing</button>
                  <button disabled={!allowed} onClick={() => changeStatus(task.id, 'done')}>Done</button>
                  <button onClick={() => toggleEdit(task.id)}>Edit Description</button>
                </>
              ) : (
                <p className="locked">Task completed — locked</p>
              )}
              <button className="remove" onClick={() => handleDelete(task.id)}>Remove</button>
            </div>

            {!allowed && task.status !== 'done' && (
              <p className="warning">Finish Dependency First!</p>
            )}
          </div>
        );
      })}
    </div>
  )
}