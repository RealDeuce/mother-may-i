/*
 * ----------------------------------------------------------------------------
 * "THE BEER-WARE LICENSE" (Revision 42):
 * <shurd@FreeBSD.ORG> wrote this file.  As long as you retain this notice you
 * can do whatever you want with this stuff. If we meet some day, and you think
 * this stuff is worth it, you can buy me a beer in return.        Stephen Hurd
 * ----------------------------------------------------------------------------
 */

class MotherMayI {
	/*
	 * Returns the first GM id.
	 */
	static firstGM(msg) {
		let i;

		for (i=0; i<game.users.entities.length; i++) {
			if (game.users.entities[i].data.role >= 4 && game.users.entities[i].data.active)
				return game.users.entities[i].data._id;
		}
		ui.notifications.error("No GM available "+msg+"!");
	}

	static setCanDrag(app, html, data) {
		if (!game.user.hasRole(CONST.USER_ROLES.TRUSTED))
			return true;
		html.find('li.actor').each((i, li) => {
			li.setAttribute("draggable", true);
			li.addEventListener('dragstart', ev => app._onDragStart(ev), false);
		});
		return true;
	}

	static askMotherDelete(scene, sceneID, entityID) {
		if (game.user.isGM)
			return true;
		if (!game.user.hasRole(CONST.USER_ROLES.TRUSTED)) {
			ui.notifications.error("Only trusted users can delete tokens.");
			return false;
		}

		let req = {action:"Delete", scene:sceneID, entity:entityID, class:"Token"};
		req.addressTo = this.firstGM("to delete token");
		let tok = canvas.scene.getEmbeddedEntity(req.class, req.entity);
		let actor = game.actors.get(tok.actorId);
		if (actor.hasPerm(game.user, "OWNER"))
			game.socket.emit("module.mother-may-i", req);
		else
			ui.notifications.error("Cannot delete tokens unless you are an owner of the actor.");
		return false;
	}

	static askMotherCreate(scene, sceneID, source, options) {
		if (game.user.isGM)
			return true;
		if (!game.user.hasRole(CONST.USER_ROLES.TRUSTED)) {
			ui.notifications.error("Only trusted users can create tokens.");
			return false;
		}

		let actor = game.actors.get(source.actorId);
		let req = {action:"Create", x:source.x, y:source.y, scene:sceneID, id:source.actorId, class:options.embeddedName};
		req.addressTo = this.firstGM("to create token");
		if (actor.hasPerm(game.user, "OWNER"))
			game.socket.emit("module.mother-may-i", req);
		else
			ui.notifications.error("Can only drop actors if you're an owner.");
		return false;
	}

	static async handleSocketRequest(req) {
		if (req.addressTo === undefined || req.addressTo === game.user._id) {
			let scene = game.scenes.get(req.scene);
			switch(req.action) {
			case 'Create':
				let actor = game.actors.get(req.id);
				let tokenData = {x: req.x, y: req.y, hidden: false};

				// This is largely copied from dropActor()...
				// Get the Token image to use
				if ( actor.data.token.randomImg ) {
					let images = await actor.getTokenImages();
					images = images.filter(i => (images.length === 1) || !(i === this._lastWildcard));
					const image = images[Math.floor(Math.random() * images.length)];
					tokenData.img = this._lastWildcard = image;
				}
 
				// Merge token data with the default
				tokenData = mergeObject(actor.data.token, tokenData, {inplace: false});
 	
				// Validate the final position is in-bounds???
				//if ( !canvas.grid.hitArea.contains(tokenData.x, tokenData.y) ) return false;
 	
				// Send the token creation request to the server and wait for acknowledgement
				await scene.createEmbeddedEntity(req.class, tokenData);
				canvas.tokens.activate();
				break;
			case 'Delete':
				await scene.deleteEmbeddedEntity(req.class, req.entity);
				break;
			}
		}
	}
}

Hooks.on('ready', () => {
	Hooks.on('renderActorDirectory', (app, html, data) => { return MotherMayI.setCanDrag(app, html, data) });
	Hooks.on('preCreateToken', (entity, id, source, options) => { return MotherMayI.askMotherCreate(entity, id, source, options) });
	Hooks.on('preDeleteToken', (scene, sceneID, entityID) => { return MotherMayI.askMotherDelete(scene, sceneID, entityID) });
	game.socket.on("module.mother-may-i", request => {
		MotherMayI.handleSocketRequest(request);
	});
});

console.log("--- Yes, you may.");
