import mongoose from "mongoose";
import { AppError } from "../errors/app-error.js";
import { personService } from "../../features/people/person.service.js";
import { WorkspaceModel } from "../../features/workspaces/workspace.model.js";

export async function resolveProfileContext(request, response, next) {
	try {
		const profileId = request.auth?.profileId || "";
		if (!profileId) throw new AppError(401, "PROFILE_REQUIRED", "Select a Requestly workspace to continue.");
		if (!mongoose.isValidObjectId(profileId)) throw new AppError(401, "INVALID_PROFILE", "Select a valid workspace identifier.");
		
		const isAllowed = request.account.allowedProfileIds?.some((id) => String(id) === String(profileId))
			|| (await WorkspaceModel.exists({ _id: profileId, ownerId: request.account._id }));

		if (!isAllowed) {
			throw new AppError(403, "PROFILE_FORBIDDEN", "This workspace is not available in the current account.");
		}

		let profile = await WorkspaceModel.findOne({ _id: profileId, ownerId: request.account._id }).lean();
		if (profile) {
			request.profileId = String(profile._id);
			request.profile = {
				_id: String(profile._id),
				name: profile.name,
				email: request.account.email,
			};
			return next();
		}

		profile = await personService.findProfileById(profileId);
		if (!profile) throw new AppError(401, "PROFILE_NOT_FOUND", "This workspace is no longer available.");
		request.profileId = String(profile._id);
		request.profile = profile;
		next();
	} catch (error) {
		next(error);
	}
}

