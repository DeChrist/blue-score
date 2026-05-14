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
      { courtNumber: 1, leftPair: { player1Id: "marcus", player2Id: "david" }, rightPair: { player1Id: "laurent", player2Id: "christopherw" } },
      { courtNumber: 2, leftPair: { player1Id: "robert", player2Id: "nic" }, rightPair: { player1Id: "jonathan", player2Id: "michael" } },
      { courtNumber: 3, leftPair: { player1Id: "daniel", player2Id: "james" }, rightPair: { player1Id: "kevin", player2Id: "christopherb" } },
    ],
    sitOutPlayerIds: ["thomas", "alex", "bartholomew", "igor"],
  },
  {
    rotaNumber: 2,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "thomas", player2Id: "alex" }, rightPair: { player1Id: "bartholomew", player2Id: "igor" } },
      { courtNumber: 2, leftPair: { player1Id: "marcus", player2Id: "laurent" }, rightPair: { player1Id: "robert", player2Id: "jonathan" } },
      { courtNumber: 3, leftPair: { player1Id: "david", player2Id: "christopherw" }, rightPair: { player1Id: "nic", player2Id: "michael" } },
    ],
    sitOutPlayerIds: ["daniel", "james", "kevin", "christopherb"],
  },
  {
    rotaNumber: 3,
    courts: [
      { courtNumber: 1, leftPair: { player1Id: "daniel", player2Id: "kevin" }, rightPair: { player1Id: "thomas", player2Id: "bartholomew" } },
      { courtNumber: 2, leftPair: { player1Id: "james", player2Id: "christopherb" }, rightPair: { player1Id: "alex", player2Id: "igor" } },
      { courtNumber: 3, leftPair: { player1Id: "marcus", player2Id: "robert" }, rightPair: { player1Id: "david", player2Id: "nic" } },
    ],
    sitOutPlayerIds: ["laurent", "christopherw", "jonathan", "michael"],
  },
];
