const express = require('express');
const cors = require('cors');

const { v4: uuidv4, validate } = require('uuid');

const app = express();
app.use(express.json());
app.use(cors());

const users = [];

// Middleware para verificar se usuario existe pelo username
function checksExistsUserAccount(request, response, next) {
    
    // dados da requisição
    const { username } = request.headers;
    const user = users.find(user => user.username === username);

    // caso usuario não exista
    if(!user){
        return response.status(404).json({ error: "User not found" });
    }

    // inserindo o user no request
    request.user = user;
    return next();
}

// Middleware para verificar se usuario pode criar ToDo
function checksCreateTodosUserAvailability(request, response, next) {
    
    // dados da requisicao
    const { user } = request;

    const countTodos = user.todos.length; // quantidade de todos criados

    // caso possua 10 todos cadastrados com plano gratis
    if (countTodos >= 10 && user.pro === false){
        return response.status(400).json({ error: "No Todos Availability" });
    }

    return next();
}

// Middleware para verificar se todo existe
function checksTodoExists(request, response, next) {

    // dados da requisicao
    const { user } = request;
    const { id } = request.params;

    // verifica se o uuid passado é valido
    if(!validate(id)){
        return response.status(400).json({ error: "Todo Uuid is not valid" });
    }

    // buscar o todo com base no id
    const todo = user.todos.find(todo => todo.id === id);
    
    // caso não exista o todo
    if (!todo) {
        return response.status(404).json({ error: "Todo not found" });
    }

    // inserindo o todo dentro do request
    request.todo = todo;
    return next();
}

// Middleware para verificar se usuario existe pelo id
function findUserById(request, response, next) {
    
    // dados da requisição
    const { id } = request.params;

    // verifica se o uuid passado é valido
    if(!validate(id)){
        return response.status(400).json({ error: "User Uuid is not valid" });
    }

    const user = users.find(user => user.id === id);

    // caso usuario não exista
    if(!user){
        return response.status(404).json({ error: "User not found" });
    }

    // inserindo o user no request
    request.user = user;
    return next();
}

app.post('/users', (request, response) => {
    const { name, username } = request.body;

    const usernameAlreadyExists = users.some((user) => user.username === username);

    if (usernameAlreadyExists) {
        return response.status(400).json({ error: 'Username already exists' });
    }

    const user = {
        id: uuidv4(),
        name,
        username,
        pro: false,
        todos: []
    };

    users.push(user);

    return response.status(201).json(user);
});

app.get('/users/:id', findUserById, (request, response) => {
    const { user } = request;

    return response.json(user);
});

app.patch('/users/:id/pro', findUserById, (request, response) => {
    const { user } = request;

    if (user.pro) {
        return response.status(400).json({ error: 'Pro plan is already activated.' });
    }

    user.pro = true;

    return response.json(user);
});

app.get('/todos', checksExistsUserAccount, (request, response) => {
    const { user } = request;

    return response.json(user.todos);
});

app.post('/todos', checksExistsUserAccount, checksCreateTodosUserAvailability, (request, response) => {
    const { title, deadline } = request.body;
    const { user } = request;

    const newTodo = {
        id: uuidv4(),
        title,
        deadline: new Date(deadline),
        done: false,
        created_at: new Date()
    };

    user.todos.push(newTodo);

    return response.status(201).json(newTodo);
});

app.put('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
    const { title, deadline } = request.body;
    const { todo } = request;

    todo.title = title;
    todo.deadline = new Date(deadline);

    return response.json(todo);
});

app.patch('/todos/:id/done', checksExistsUserAccount, checksTodoExists, (request, response) => {
    const { todo } = request;

    todo.done = true;

    return response.json(todo);
});

app.delete('/todos/:id', checksExistsUserAccount, checksTodoExists, (request, response) => {
    const { user, todo } = request;

    const todoIndex = user.todos.indexOf(todo);

    if (todoIndex === -1) {
        return response.status(404).json({ error: 'Todo not found' });
    }

    user.todos.splice(todoIndex, 1);

    return response.status(204).send();
});

module.exports = {
    app,
    users,
    checksExistsUserAccount,
    checksCreateTodosUserAvailability,
    checksTodoExists,
    findUserById
};