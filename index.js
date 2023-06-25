import { ApolloServer, UserInputError, gql } from "apollo-server";
import { v1 as uuid } from "uuid";
import axios from "axios";
import { GraphQLError } from "graphql";

// const persons = [
//   {
//     name: "David",
//     phone: "034-123557",
//     street: "siempre viva",
//     city: "Barcelona",
//     id: "123k23h34-343s",
//   },
//   {
//     name: "Edgar",
//     phone: "034-123557",
//     street: "siempre viva",
//     city: "Guadalajara",
//     id: "123k23h34-343s",
//   },
//   {
//     name: "Michel",
//     phone: "034-123557",
//     street: "siempre viva",
//     city: "Tokyo",
//     id: "123k23h34-343s",
//   },
//   {
//     name: "Cristian",
//     phone: "034-123557",
//     street: "siempre viva",
//     city: "Rio de Janeiro",
//     id: "123k23h34-343s",
//   },
//   {
//     name: "Eduardo",
//     phone: "034-123557",
//     street: "siempre viva",
//     city: "Helsinky",
//     id: "123k23h34-343s",
//   },
//   {
//     name: "Maria",
//     street: "siempre viva",
//     city: "Helsinky",
//     id: "123k23h34-343s",
//   },
// ];

const typeDefs = gql`
  enum YesNo {
    YES
    NO
  }

  type Address {
    street: String!
    city: String
  }

  type Person {
    name: String!
    phone: String
    address: Address!
    id: ID!
  }

  type Query {
    personCount: Int!
    allPersons(phone: YesNo): [Person]!
    findPerson(name: String!): Person
  }

  type Mutation {
    addPerson(
      name: String!
      phone: String
      street: String!
      city: String!
    ): Person
    editNumber(id: ID!, phone: String!): Person
    deletePerson(id: ID!): Int
  }
`;

const fetchPersonsFromAPI = async () =>
  await axios.get("http://localhost:3000/persons");

const allPersonsResolver = async (args) => {
  const { data: personsFromRestAPI } = await fetchPersonsFromAPI();

  if (!args.phone) {
    return personsFromRestAPI;
  }

  const byPhone = (person) =>
    args.phone === "YES" ? person.phone : !person.phone;

  return personsFromRestAPI.filter(byPhone);
};

const findPersonResolver = async (args) => {
  const { name } = args;
  const { data: personsFromRestAPI } = await fetchPersonsFromAPI();
  return personsFromRestAPI.find((person) => person.name === name);
};

const addPersonMutation = async (args) => {
  const { data: personsFromRestAPI } = await fetchPersonsFromAPI();

  const newPerson = { id: uuid(), ...args };

  if (personsFromRestAPI.some((person) => person.name === newPerson.name)) {
    throw new UserInputError("Name must be unique", {
      invalidArgs: args.name,
    });
  }

  const postedUser = await axios.post(
    "http://localhost:3000/persons",
    newPerson
  );

  if (!postedUser) {
    throw new GraphQLError("The user could not be created", {
      extensions: "Error",
    });
  }

  return postedUser.data;
};

const editNumberMutation = async (args) => {
  // const { data: personsFromRestAPI } = await fetchPersonsFromAPI();

  // const findedPerson = personsFromRestAPI.find((p) => p.id === args.id);

  // if (!findedPerson) {
  //   throw new GraphQLError("User not found", {
  //     extensions: "USER_N0T_FOUND",
  //   });
  // }

  // const modifiedPerson = { ...findedPerson, phone: args.phone };

  const updatedPerson = await axios.patch(
    `http://localhost:3000/persons/${args.id}`,
    {
      phone: args.phone,
    }
  );

  if (!updatedPerson) {
    throw new GraphQLError("The user phone number could not be updated", {
      extensions: "Error",
    });
  }

  return updatedPerson.data;
};

const deletePersonMutation = async (args) => {
  const deletedPerson = await axios.delete(
    `http://localhost:3000/persons/${args.id}`
  );

  if (deletedPerson.status !== 200) {
    throw new GraphQLError("The user could not be deleted", {
      extensions: "Error",
    });
  }

  return deletedPerson.status;
};

const resolvers = {
  Query: {
    personCount: () => persons.length,
    allPersons: (root, args) => allPersonsResolver(args),
    findPerson: (root, args) => findPersonResolver(args),
  },
  Mutation: {
    addPerson: (root, args) => addPersonMutation(args),
    editNumber: (root, args) => editNumberMutation(args),
    deletePerson: (root, args) => deletePersonMutation(args),
  },
  Person: {
    address: (root) => {
      return {
        street: root.street,
        city: root.city,
      };
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

server.listen().then(({ url }) => console.log(`Server ready in port: ${url}`));
