import type { Player, Rota } from "./types";

export const samplePlayers: Player[] = [
  { id: "marcus", displayName: "Marcus Thompson" },
  { id: "david", displayName: "David Mitchell" },
  { id: "laurent", displayName: "Laurent Bernard" },
  { id: "christopherw", displayName: "Christopher Walsh" },
  { id: "robert", displayName: "Robert Chapman" },
  { id: "nic", displayName: "Nicolas Leclerc", aliases: ["Nic"] },
  { id: "jonathan", displayName: "Jonathan Pierce" },
  { id: "michael", displayName: "Michael Stevens" },
  { id: "daniel", displayName: "Daniel Morrison" },
  { id: "james", displayName: "James Cooper" },
  { id: "kevin", displayName: "Kevin Reynolds" },
  { id: "christopherb", displayName: "Christopher Brooks" },
  { id: "thomas", displayName: "Thomas Bennett" },
  { id: "alex", displayName: "Alexander Graham", aliases: ["Alex"] },
  { id: "bartholomew", displayName: "Bartholomew Hart" },
  { id: "igor", displayName: "Igor Petrov" },
];

export const sampleRotas: Rota[] = [
  {
    rotaNumber: 1,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "david", player2Id: "laurent" }, rightPair: { player1Id: "christopherw", player2Id: "robert" } },
      { courtNumber: 2, leftPair: { player1Id: "nic", player2Id: "jonathan" }, rightPair: { player1Id: "michael", player2Id: "james" } },
      { courtNumber: 3, leftPair: { player1Id: "daniel", player2Id: "kevin" }, rightPair: { player1Id: "christopherb", player2Id: "thomas" } },
    ],
    sitOutPlayerIds: ["marcus", "alex", "bartholomew", "igor"],
  },
  {
    rotaNumber: 2,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "david" }, rightPair: { player1Id: "nic", player2Id: "daniel" } },
      { courtNumber: 2, leftPair: { player1Id: "laurent", player2Id: "christopherw" }, rightPair: { player1Id: "jonathan", player2Id: "alex" } },
      { courtNumber: 3, leftPair: { player1Id: "robert", player2Id: "michael" }, rightPair: { player1Id: "bartholomew", player2Id: "igor" } },
    ],
    sitOutPlayerIds: ["james", "kevin", "christopherb", "thomas"],
  },
  {
    rotaNumber: 3,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "laurent" }, rightPair: { player1Id: "kevin", player2Id: "bartholomew" } },
      { courtNumber: 2, leftPair: { player1Id: "david", player2Id: "christopherw" }, rightPair: { player1Id: "christopherb", player2Id: "igor" } },
      { courtNumber: 3, leftPair: { player1Id: "robert", player2Id: "james" }, rightPair: { player1Id: "thomas", player2Id: "alex" } },
    ],
    sitOutPlayerIds: ["nic", "jonathan", "michael", "daniel"],
  },
  {
    rotaNumber: 4,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "jonathan" }, rightPair: { player1Id: "thomas", player2Id: "igor" } },
      { courtNumber: 2, leftPair: { player1Id: "nic", player2Id: "michael" }, rightPair: { player1Id: "kevin", player2Id: "alex" } },
      { courtNumber: 3, leftPair: { player1Id: "daniel", player2Id: "christopherb" }, rightPair: { player1Id: "james", player2Id: "bartholomew" } },
    ],
    sitOutPlayerIds: ["david", "laurent", "christopherw", "robert"],
  },
  {
    rotaNumber: 5,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "david", player2Id: "james" }, rightPair: { player1Id: "christopherw", player2Id: "kevin" } },
      { courtNumber: 2, leftPair: { player1Id: "laurent", player2Id: "michael" }, rightPair: { player1Id: "daniel", player2Id: "thomas" } },
      { courtNumber: 3, leftPair: { player1Id: "robert", player2Id: "nic" }, rightPair: { player1Id: "jonathan", player2Id: "christopherb" } },
    ],
    sitOutPlayerIds: ["marcus", "alex", "bartholomew", "igor"],
  },
  {
    rotaNumber: 6,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "robert" }, rightPair: { player1Id: "christopherw", player2Id: "michael" } },
      { courtNumber: 2, leftPair: { player1Id: "david", player2Id: "jonathan" }, rightPair: { player1Id: "alex", player2Id: "bartholomew" } },
      { courtNumber: 3, leftPair: { player1Id: "laurent", player2Id: "daniel" }, rightPair: { player1Id: "nic", player2Id: "igor" } },
    ],
    sitOutPlayerIds: ["james", "kevin", "christopherb", "thomas"],
  },
  {
    rotaNumber: 7,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "christopherb" }, rightPair: { player1Id: "laurent", player2Id: "alex" } },
      { courtNumber: 2, leftPair: { player1Id: "david", player2Id: "bartholomew" }, rightPair: { player1Id: "christopherw", player2Id: "thomas" } },
      { courtNumber: 3, leftPair: { player1Id: "robert", player2Id: "igor" }, rightPair: { player1Id: "james", player2Id: "kevin" } },
    ],
    sitOutPlayerIds: ["nic", "jonathan", "michael", "daniel"],
  },
  {
    rotaNumber: 8,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "michael" }, rightPair: { player1Id: "james", player2Id: "christopherb" } },
      { courtNumber: 2, leftPair: { player1Id: "nic", player2Id: "kevin" }, rightPair: { player1Id: "thomas", player2Id: "bartholomew" } },
      { courtNumber: 3, leftPair: { player1Id: "jonathan", player2Id: "igor" }, rightPair: { player1Id: "daniel", player2Id: "alex" } },
    ],
    sitOutPlayerIds: ["david", "laurent", "christopherw", "robert"],
  },
  {
    rotaNumber: 9,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "david", player2Id: "michael" }, rightPair: { player1Id: "laurent", player2Id: "james" } },
      { courtNumber: 2, leftPair: { player1Id: "christopherw", player2Id: "nic" }, rightPair: { player1Id: "robert", player2Id: "daniel" } },
      { courtNumber: 3, leftPair: { player1Id: "jonathan", player2Id: "thomas" }, rightPair: { player1Id: "kevin", player2Id: "christopherb" } },
    ],
    sitOutPlayerIds: ["marcus", "alex", "bartholomew", "igor"],
  },
];
