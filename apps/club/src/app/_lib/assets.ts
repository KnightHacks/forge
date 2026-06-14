export const CLUB_ASSET_BASE_URL = "https://assets.knighthacks.org";

function clubAsset(fileName: string) {
  return `${CLUB_ASSET_BASE_URL}/${fileName}`;
}

export const CLUB_ASSETS = {
  amdSponsorTeamPhoto: clubAsset("amd-sponsor-team-photo.jpg"),
  clubCommunityEvent: clubAsset("club-community-event.jpg"),
  clubMembersGathering: clubAsset("club-members-gathering.jpg"),
  clubTeamWaterfrontGroup: clubAsset("club-team-waterfront-group.jpg"),
  eventsExpoFloor: clubAsset("events-expo-floor.jpg"),
  gameDevKnightsTabling: clubAsset("game-dev-knights-tabling.jpg"),
  hackathonAwardWinners: clubAsset("hackathon-award-winners.jpg"),
  hackathonFloorGathering: clubAsset("hackathon-floor-gathering.jpg"),
  hackathonMainRoom: clubAsset("hackathon-main-room.jpg"),
  hackathonPrizeWinnersGroup: clubAsset("hackathon-prize-winners-group.jpg"),
  hackathonVolunteersFoodService: clubAsset(
    "hackathon-volunteers-food-service.jpg",
  ),
  kickstartWorkshopSession: clubAsset("kickstart-workshop-session.jpg"),
  knightHacksSetsYouApart: clubAsset("knight-hacks-sets-you-apart.webp"),
  memberNetworkingSession: clubAsset("member-networking-session.jpg"),
  projectCollaboration: clubAsset("project-collaboration.jpg"),
  projectLaunchPresentations: clubAsset("project-launch-presentations.jpg"),
  serviceNowSponsorPegasus: clubAsset("servicenow-sponsor-pegasus.jpg"),
  sponsorSessionStudents: clubAsset("sponsor-session-students.jpg"),
  ucfPegasusMascotStudents: clubAsset("ucf-pegasus-mascot-students.jpg"),
} as const;
